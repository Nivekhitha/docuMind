from typing import List, Dict, Any
from backend.app.config import CHUNK_SIZE, CHUNK_OVERLAP


class ChunkingService:
    def __init__(self, chunk_size: int = CHUNK_SIZE, chunk_overlap: int = CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_pages_into_chunks(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        global_chunk_idx = 0

        for page in pages:
            page_text = page["text"]
            page_number = page["page_number"]
            doc_id = page["document_id"]
            filename = page["filename"]

            if not page_text:
                continue

            if len(page_text) <= self.chunk_size:
                chunk_id = f"{doc_id}_p{page_number}_c{global_chunk_idx}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": doc_id,
                    "filename": filename,
                    "page_number": page_number,
                    "text": page_text,
                    "chunk_index": global_chunk_idx
                })
                global_chunk_idx += 1
                continue

            start = 0
            text_len = len(page_text)
            # Move forward by the non-overlapping portion of each chunk.
            step = max(1, self.chunk_size - self.chunk_overlap)

            while start < text_len:
                end = min(start + self.chunk_size, text_len)
                chunk_slice = page_text[start:end].strip()

                if chunk_slice:
                    chunk_id = f"{doc_id}_p{page_number}_c{global_chunk_idx}"
                    chunks.append({
                        "chunk_id": chunk_id,
                        "document_id": doc_id,
                        "filename": filename,
                        "page_number": page_number,
                        "text": chunk_slice,
                        "chunk_index": global_chunk_idx
                    })
                    global_chunk_idx += 1

                if end >= text_len:
                    break
                start += step

        return chunks
