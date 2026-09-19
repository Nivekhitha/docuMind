import logging
from fastapi import APIRouter, HTTPException
from backend.app.models.schemas import ChatRequest, ChatResponse
from backend.app.services.embedding_service import EmbeddingService
from backend.app.services.vector_service import VectorService
from backend.app.services.llm_service import LLMService
from backend.app.services.document_store import DocumentStore
from backend.app.config import TOP_K

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

store = DocumentStore()


@router.post("", response_model=ChatResponse)
def chat_with_documents(request: ChatRequest):
    """Answer questions using retrieved document context."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Validate the selected document before querying the index.
    if request.document_id:
        doc = store.get_document(request.document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Selected document not found.")
        if doc.get("status") != "ready":
            raise HTTPException(
                status_code=400,
                detail=f"Document is currently {doc.get('status')}. Please wait until it is ready."
            )

    k = request.top_k or TOP_K

    try:
        embedder = EmbeddingService()
        vector_db = VectorService()
        llm = LLMService()

        query_vector = embedder.get_query_embedding(request.question)

        relevant_chunks = vector_db.semantic_search(
            query_embedding=query_vector,
            document_id=request.document_id,
            top_k=k
        )

        result = llm.answer_question(
            question=request.question,
            context_chunks=relevant_chunks
        )

        return ChatResponse(
            answer=result["answer"],
            citations=result["citations"]
        )
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        # Keep internal exception details out of the API response.
        raise HTTPException(
            status_code=500,
            detail="Unable to get an answer right now. Please try again."
        )
