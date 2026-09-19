import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import FRONTEND_URL
from backend.app.routes import documents, chat, analysis
from backend.app.services.vector_service import VectorService
from backend.app.services.document_store import DocumentStore

app = FastAPI(
    title="DocuMind API",
    description="AI Research & Document Assistant Backend powered by FastAPI, PyMuPDF, ChromaDB, and Gemini",
    version="1.0.0"
)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
if FRONTEND_URL and FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL)

app_url = os.getenv("APP_URL")
if app_url and app_url not in allowed_origins:
    allowed_origins.append(app_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(analysis.router)


@app.get("/api/health")
def health_check():
    """Return API and document index health information."""
    try:
        vector_db = VectorService()
        chroma_count = vector_db.get_total_count()
    except Exception:
        chroma_count = 0

    try:
        store = DocumentStore()
        docs_count = len(store.list_documents())
    except Exception:
        docs_count = 0

    return {
        "status": "ok",
        "service": "DocuMind Research & Document Assistant",
        "chroma_chunks": chroma_count,
        "documents_count": docs_count
    }


# Serve the built frontend when running as a standalone app.
dist_dir = Path(__file__).parent.parent.parent / "dist"
if dist_dir.exists() and dist_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    from backend.app.config import BACKEND_PORT
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=BACKEND_PORT, reload=False)
