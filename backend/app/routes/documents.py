import os
import uuid
import re
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from backend.app.config import UPLOAD_DIR, MAX_FILE_SIZE_MB
from backend.app.models.schemas import DocumentMetadata, DocumentUploadResponse
from backend.app.services.document_store import DocumentStore
from backend.app.services.vector_service import VectorService
from backend.app.services.ingestion_worker import process_document_background

router = APIRouter(prefix="/api/documents", tags=["documents"])
store = DocumentStore()


def sanitize_filename(name: str) -> str:
    cleaned = os.path.basename(name)
    cleaned = re.sub(r'[^a-zA-Z0-9_\.-]', '_', cleaned)
    return cleaned or "document.pdf"


@router.get("", response_model=List[DocumentMetadata])
def list_documents():
    """Returns list of all documents with their metadata and processing status."""
    return store.list_documents()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Accepts PDF upload, validates file type & size, saves to disk,
    registers document with status='processing', and triggers background ingestion.
    Returns immediately to avoid HTTP request timeouts on large PDFs/books.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Unsupported file format. Only PDF files are supported.")

    safe_name = sanitize_filename(file.filename)
    document_id = str(uuid.uuid4())

    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    saved_path = os.path.join(UPLOAD_DIR, f"{document_id}_{safe_name}")

    total_size = 0
    header_checked = False

    try:
        with open(saved_path, "wb") as f_out:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                total_size += len(chunk)
                if total_size > max_bytes:
                    f_out.close()
                    if os.path.exists(saved_path):
                        os.remove(saved_path)
                    raise HTTPException(
                        status_code=400,
                        detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB."
                    )

                if not header_checked:
                    # PDF header validation
                    if not chunk.startswith(b"%PDF"):
                        f_out.close()
                        if os.path.exists(saved_path):
                            os.remove(saved_path)
                        raise HTTPException(
                            status_code=400,
                            detail="Invalid or corrupt PDF file (header does not match PDF format)."
                        )
                    header_checked = True

                f_out.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    doc_record = {
        "id": document_id,
        "filename": safe_name,
        "file_size": total_size,
        "page_count": 0,
        "chunk_count": 0,
        "status": "processing",
        "error_message": None,
        "created_at": datetime.utcnow().isoformat(),
        "file_path": saved_path
    }
    store.save_document(doc_record)

    background_tasks.add_task(
        process_document_background,
        file_path=saved_path,
        document_id=document_id,
        filename=safe_name
    )

    return DocumentUploadResponse(
        document_id=document_id,
        filename=safe_name,
        status="processing",
        message="Upload received. Processing in background."
    )


@router.get("/{document_id}", response_model=DocumentMetadata)
def get_document(document_id: str):
    doc = store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.delete("/{document_id}")
def delete_document(document_id: str):
    doc = store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        vector_db = VectorService()
        vector_db.delete_document_chunks(document_id)
    except Exception:
        pass

    file_path = doc.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    store.delete_document(document_id)

    return {"message": "Document and associated index deleted successfully.", "document_id": document_id}
