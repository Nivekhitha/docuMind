import logging
from fastapi import APIRouter, HTTPException
from backend.app.models.schemas import (
    SummaryResponse,
    QuizResponse,
    QuizQuestion,
    FlashcardsResponse,
    Flashcard,
    CompareRequest,
    CompareResponse
)
from backend.app.services.document_store import DocumentStore
from backend.app.services.vector_service import VectorService
from backend.app.services.llm_service import LLMService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])
store = DocumentStore()


@router.post("/documents/{document_id}/summary", response_model=SummaryResponse)
def generate_summary(document_id: str):
    doc = store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.get("status") != "ready":
        raise HTTPException(status_code=400, detail=f"Document is {doc.get('status')}. Please wait until ready.")

    try:
        vector_db = VectorService()
        chunks = vector_db.get_document_chunks(document_id)
        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks found for this document.")

        llm = LLMService()
        result = llm.summarize_document(chunks=chunks, filename=doc["filename"])

        return SummaryResponse(
            document_id=document_id,
            filename=doc["filename"],
            summary=result.get("summary", "Summary not available."),
            key_points=result.get("key_points", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summary route error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to create the summary. Please try again.")


@router.post("/documents/{document_id}/quiz", response_model=QuizResponse)
def generate_quiz(document_id: str):
    doc = store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.get("status") != "ready":
        raise HTTPException(status_code=400, detail=f"Document is {doc.get('status')}. Please wait until ready.")

    try:
        vector_db = VectorService()
        chunks = vector_db.get_document_chunks(document_id)
        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks found for this document.")

        llm = LLMService()
        raw_questions = llm.generate_quiz(chunks=chunks, filename=doc["filename"])

        questions = [
            QuizQuestion(
                question=q.get("question", ""),
                options=q.get("options", []),
                answer=q.get("answer", 0),
                explanation=q.get("explanation", "")
            )
            for q in raw_questions
        ]

        return QuizResponse(
            document_id=document_id,
            filename=doc["filename"],
            questions=questions
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quiz route error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to generate the quiz. Please try again.")


@router.post("/documents/{document_id}/flashcards", response_model=FlashcardsResponse)
def generate_flashcards(document_id: str):
    doc = store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.get("status") != "ready":
        raise HTTPException(status_code=400, detail=f"Document is {doc.get('status')}. Please wait until ready.")

    try:
        vector_db = VectorService()
        chunks = vector_db.get_document_chunks(document_id)
        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks found for this document.")

        llm = LLMService()
        raw_cards = llm.generate_flashcards(chunks=chunks, filename=doc["filename"])

        cards = [
            Flashcard(front=c.get("front", ""), back=c.get("back", ""))
            for c in raw_cards
        ]

        return FlashcardsResponse(
            document_id=document_id,
            filename=doc["filename"],
            cards=cards
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flashcards route error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to create the flashcards. Please try again.")


@router.post("/compare", response_model=CompareResponse)
def compare_documents(request: CompareRequest):

    doc1 = store.get_document(request.doc_id_1)
    doc2 = store.get_document(request.doc_id_2)

    if not doc1:
        raise HTTPException(status_code=404, detail=f"Document 1 ({request.doc_id_1}) not found.")
    if not doc2:
        raise HTTPException(status_code=404, detail=f"Document 2 ({request.doc_id_2}) not found.")

    if doc1.get("status") != "ready" or doc2.get("status") != "ready":
        raise HTTPException(status_code=400, detail="Both documents must be in READY status before comparing.")

    try:
        vector_db = VectorService()
        chunks1 = vector_db.get_document_chunks(request.doc_id_1)
        chunks2 = vector_db.get_document_chunks(request.doc_id_2)

        llm = LLMService()
        result = llm.compare_documents(
            doc_1_name=doc1["filename"],
            doc_1_chunks=chunks1,
            doc_2_name=doc2["filename"],
            doc_2_chunks=chunks2,
            topic=request.topic
        )

        return CompareResponse(
            doc_1_id=request.doc_id_1,
            doc_1_name=doc1["filename"],
            doc_2_id=request.doc_id_2,
            doc_2_name=doc2["filename"],
            topic=request.topic,
            comparison=result.get("comparison", ""),
            doc_1_key_takeaways=result.get("doc_1_key_takeaways", []),
            doc_2_key_takeaways=result.get("doc_2_key_takeaways", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Compare route error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to compare documents right now. Please try again.")
