import json
import os
import threading
from typing import List, Optional, Dict, Any
from backend.app.config import METADATA_FILE

_lock = threading.Lock()


class DocumentStore:
    def __init__(self, filepath: str = METADATA_FILE):
        self.filepath = filepath
        self._ensure_file()

    def _ensure_file(self):
        with _lock:
            if not os.path.exists(self.filepath):
                os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
                with open(self.filepath, "w", encoding="utf-8") as f:
                    json.dump({}, f)

    def _load_all(self) -> Dict[str, Any]:
        with _lock:
            try:
                if not os.path.exists(self.filepath):
                    return {}
                with open(self.filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}

    def _save_all(self, data: Dict[str, Any]):
        with _lock:
            temp_path = self.filepath + ".tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            os.replace(temp_path, self.filepath)

    def list_documents(self) -> List[Dict[str, Any]]:
        data = self._load_all()
        docs = list(data.values())
        docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return docs

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        data = self._load_all()
        return data.get(doc_id)

    def save_document(self, doc: Dict[str, Any]):
        data = self._load_all()
        data[doc["id"]] = doc
        self._save_all(data)

    def update_document(
        self,
        doc_id: str,
        status: Optional[str] = None,
        error_message: Optional[str] = None,
        page_count: Optional[int] = None,
        chunk_count: Optional[int] = None
    ):
        data = self._load_all()
        if doc_id in data:
            if status is not None:
                data[doc_id]["status"] = status
            if error_message is not None:
                data[doc_id]["error_message"] = error_message
            if page_count is not None:
                data[doc_id]["page_count"] = page_count
            if chunk_count is not None:
                data[doc_id]["chunk_count"] = chunk_count
            self._save_all(data)

    def delete_document(self, doc_id: str) -> bool:
        data = self._load_all()
        if doc_id in data:
            del data[doc_id]
            self._save_all(data)
            return True
        return False
