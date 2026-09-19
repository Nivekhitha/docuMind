import os
from typing import List, Dict, Any
import pymupdf


class ScannedPDFError(Exception):
    pass


class PDFService:
    @staticmethod
    def extract_text_by_pages(file_path: str, document_id: str, filename: str) -> List[Dict[str, Any]]:
        """Extract text from a PDF page by page and preserve source metadata."""
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        try:
            doc = pymupdf.open(file_path)
        except Exception as e:
            raise ValueError(f"Unable to read or parse PDF file: {str(e)}")

        pages_data = []
        total_text_length = 0

        try:
            for page_index in range(len(doc)):
                page = doc[page_index]
                page_text = page.get_text("text") or ""
                cleaned_text = page_text.strip()
                total_text_length += len(cleaned_text)

                pages_data.append({
                    "page_number": page_index + 1,
                    "text": cleaned_text,
                    "document_id": document_id,
                    "filename": filename
                })
        finally:
            doc.close()

        if total_text_length < 20:
            raise ScannedPDFError(
                "This PDF appears to contain scanned/image-only pages. OCR is not currently supported."
            )

        return pages_data
