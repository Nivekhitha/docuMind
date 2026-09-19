import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from backend.app.config import CHROMA_PATH

logger = logging.getLogger(__name__)
COLLECTION_NAME = "documind_research_chunks"


_shared_client = None
_shared_collection = None


def _get_shared_chroma(persist_directory: str = CHROMA_PATH):
    global _shared_client, _shared_collection
    if _shared_client is None:
        _shared_client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        _shared_collection = _shared_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "DocuMind PDF chunk embeddings"}
        )
    return _shared_client, _shared_collection


class VectorService:
    def __init__(self, persist_directory: str = CHROMA_PATH):
        self.persist_directory = persist_directory
        self.client, self.collection = _get_shared_chroma(persist_directory)

    def add_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        """Store document chunks and their embeddings in ChromaDB."""
        if not chunks or not embeddings:
            return

        if len(chunks) != len(embeddings):
            raise ValueError(f"Mismatch between chunks count ({len(chunks)}) and embeddings count ({len(embeddings)})")

        ids = [c["chunk_id"] for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "document_id": str(c["document_id"]),
                "filename": str(c["filename"]),
                "page_number": int(c["page_number"]),
                "chunk_id": str(c["chunk_id"]),
                "chunk_index": int(c["chunk_index"])
            }
            for c in chunks
        ]

        batch_size = 500
        for i in range(0, len(ids), batch_size):
            end = i + batch_size
            self.collection.add(
                ids=ids[i:end],
                embeddings=embeddings[i:end],
                metadatas=metadatas[i:end],
                documents=documents[i:end]
            )

        logger.info(f"Successfully added {len(chunks)} chunks to ChromaDB collection {COLLECTION_NAME}")

    def semantic_search(
        self,
        query_embedding: List[float],
        document_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Retrieve the most relevant chunks, optionally filtered by document."""
        where_clause = {"document_id": document_id} if document_id else None

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )

        retrieved: List[Dict[str, Any]] = []
        if not results or not results["documents"] or not results["documents"][0]:
            return retrieved

        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else []
        distances = results["distances"][0] if results.get("distances") else []

        for idx in range(len(docs)):
            retrieved.append({
                "text": docs[idx],
                "metadata": metas[idx] if idx < len(metas) else {},
                "distance": distances[idx] if idx < len(distances) else None
            })

        return retrieved

    def get_document_chunks(self, document_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieve chunks for a document in their original order."""
        result = self.collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"],
            limit=limit
        )

        chunks = []
        if result and result.get("documents"):
            for i, doc in enumerate(result["documents"]):
                chunks.append({
                    "text": doc,
                    "metadata": result["metadatas"][i] if result.get("metadatas") else {}
                })

        chunks.sort(key=lambda x: x["metadata"].get("chunk_index", 0))
        return chunks

    def delete_document_chunks(self, document_id: str):
        """
        Deletes all chunks belonging to a document.
        """
        try:
            self.collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted ChromaDB chunks for document {document_id}")
        except Exception as e:
            logger.warning(f"ChromaDB delete failed or nothing to delete: {e}")

    def get_total_count(self) -> int:
        """Return the total number of stored chunks."""
        return self.collection.count()
