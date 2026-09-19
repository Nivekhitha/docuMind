import logging
import time
from backend.app.services.pdf_service import PDFService, ScannedPDFError
from backend.app.services.chunking_service import ChunkingService
from backend.app.services.embedding_service import EmbeddingService, EmbeddingQuotaError
from backend.app.services.vector_service import VectorService
from backend.app.services.document_store import DocumentStore

logger = logging.getLogger(__name__)


def process_document_background(file_path: str, document_id: str, filename: str):
    
    store = DocumentStore()

    try:
        logger.info(f"Starting background ingestion for doc {document_id} ({filename})")

        pages = PDFService.extract_text_by_pages(
            file_path=file_path,
            document_id=document_id,
            filename=filename
        )
        page_count = len(pages)
        store.update_document(doc_id=document_id, page_count=page_count)
        logger.info(f"Extracted {page_count} pages from {filename}")

        chunker = ChunkingService()
        chunks = chunker.split_pages_into_chunks(pages)
        if not chunks:
            store.update_document(
                doc_id=document_id,
                status="error",
                error_message="No extractable text chunks could be found in this document."
            )
            return

        store.update_document(doc_id=document_id, chunk_count=len(chunks))
        logger.info(f"Created {len(chunks)} chunks for {filename}")

        embedder = EmbeddingService()
        vector_db = VectorService()

        batch_size = 30
        total_chunks = len(chunks)
        total_batches = (total_chunks + batch_size - 1) // batch_size

        for i in range(0, total_chunks, batch_size):
            batch_num = (i // batch_size) + 1
            batch_chunks = chunks[i:i + batch_size]
            batch_texts = [c["text"] for c in batch_chunks]

            logger.info(f"Embedding batch {batch_num}/{total_batches}")
            batch_embeddings = embedder.get_batch_embeddings(texts=batch_texts, batch_size=batch_size)

            vector_db.add_chunks(chunks=batch_chunks, embeddings=batch_embeddings)
            logger.info(f"Stored batch {batch_num}/{total_batches}")

            if batch_num < total_batches:
                time.sleep(1.5)

        logger.info("Embedding complete")

        
        store.update_document(
            doc_id=document_id,
            status="ready",
            chunk_count=len(chunks),
            page_count=page_count
        )
        logger.info(f"Ingestion completed successfully for doc {document_id} ({filename})")

    except ScannedPDFError as e:
        logger.warning(f"Scanned PDF detected for {document_id}: {e}")
        store.update_document(
            doc_id=document_id,
            status="error",
            error_message="This PDF appears to contain scanned/image-only pages. OCR is not currently supported."
        )
    except EmbeddingQuotaError as e:
        logger.warning(f"Embedding quota exceeded during ingestion for {document_id}: {e}")
        store.update_document(
            doc_id=document_id,
            status="error",
            error_message="Gemini embedding API rate limit reached. Please wait 1-2 minutes and try again."
        )
    except Exception as e:
        logger.error(f"Error during background ingestion for {document_id}: {e}", exc_info=True)
        err_str = str(e)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
            user_msg = "Gemini embedding API rate limit reached. Please wait 1-2 minutes and try again."
        else:
            user_msg = "Something went wrong while processing the document. Please try again."
        store.update_document(
            doc_id=document_id,
            status="error",
            error_message=user_msg
        )


