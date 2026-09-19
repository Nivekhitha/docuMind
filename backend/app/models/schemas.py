from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int = 0
    chunk_count: int = 0
    status: str = "processing"  # "processing", "ready", "error"
    error_message: Optional[str] = None
    created_at: str


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    message: str


class Citation(BaseModel):
    document: str
    page: int
    snippet: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    document_id: Optional[str] = None
    top_k: Optional[int] = 5


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation] = []


class SummaryResponse(BaseModel):
    document_id: str
    filename: str
    summary: str
    key_points: List[str] = []


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: int
    explanation: str


class QuizResponse(BaseModel):
    document_id: str
    filename: str
    questions: List[QuizQuestion] = []


class Flashcard(BaseModel):
    front: str
    back: str


class FlashcardsResponse(BaseModel):
    document_id: str
    filename: str
    cards: List[Flashcard] = []


class CompareRequest(BaseModel):
    doc_id_1: str
    doc_id_2: str
    topic: Optional[str] = None


class CompareResponse(BaseModel):
    doc_1_id: str
    doc_1_name: str
    doc_2_id: str
    doc_2_name: str
    topic: Optional[str] = None
    comparison: str
    doc_1_key_takeaways: List[str] = []
    doc_2_key_takeaways: List[str] = []
