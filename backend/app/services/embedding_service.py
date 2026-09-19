import logging
import time
import re
from typing import List, Optional
from google import genai
from google.genai import types
from backend.app.config import GEMINI_API_KEY, EMBEDDING_MODEL

logger = logging.getLogger(__name__)


class EmbeddingQuotaError(Exception):
    """Raised when Gemini embedding API rate limit or quota is exceeded after retries."""
    pass


class EmbeddingService:
    def __init__(self, api_key: str = GEMINI_API_KEY, model: str = EMBEDDING_MODEL):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured in the environment.")
        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.max_retry_delay = 35.0  # Prevent excessively long retry delays.

    def _embed_with_retry(self, **kwargs):
       
        max_attempts = 4
        last_error = None

        for attempt in range(max_attempts):
            try:
                return self.client.models.embed_content(**kwargs)
            except Exception as e:
                last_error = e
                err_class = e.__class__.__name__
                err_str = f"{err_class}: {str(e)}"
                
                is_rate_limit = (
                    "429" in err_str
                    or "RESOURCE_EXHAUSTED" in err_str
                    or "quota" in err_str.lower()
                    or "rate limit" in err_str.lower()
                    or "rate_limit" in err_str.lower()
                    or "toomanyrequests" in err_str.lower()
                )
                is_transient_server = "503" in err_str or "UNAVAILABLE" in err_str or "500" in err_str

                if (is_rate_limit or is_transient_server) and attempt < max_attempts - 1:
                    parsed_delay: Optional[float] = None
                    m = re.search(r"retry in (\d+(\.\d+)?)s", err_str, re.IGNORECASE)
                    if m:
                        parsed_delay = float(m.group(1))
                    else:
                        m2 = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+(\.\d+)?)s?['\"]?", err_str, re.IGNORECASE)
                        if m2:
                            parsed_delay = float(m2.group(1))

                    if parsed_delay is not None:
                        sleep_time = min(max(parsed_delay + 1.0, 3.0), self.max_retry_delay)
                    else:
                        sleep_time = min(4.0 * (2 ** attempt), self.max_retry_delay)

                    logger.warning(
                        f"Embedding API rate-limit/transient response (attempt {attempt + 1}/{max_attempts}): "
                        f"Backing off for {sleep_time:.1f}s..."
                    )
                    time.sleep(sleep_time)
                else:
                    if is_rate_limit:
                        logger.error(f"Embedding API quota exhausted after {attempt + 1} attempts: {err_str}")
                        raise EmbeddingQuotaError(
                            "Gemini embedding API rate limit reached. Please wait 1-2 minutes and try again."
                        ) from e
                    raise e

        if "429" in str(last_error) or "RESOURCE_EXHAUSTED" in str(last_error):
            raise EmbeddingQuotaError("Gemini embedding API rate limit reached. Please wait 1-2 minutes and try again.")
        raise last_error

    def get_query_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding for a search query
        """
        if not text or not text.strip():
            raise ValueError("Query text cannot be empty.")

        response = self._embed_with_retry(
            model=self.model,
            contents=text.strip()
        )
        if not response.embeddings:
            raise RuntimeError("Gemini embedding returned empty result for query.")
        return response.embeddings[0].values

    def get_batch_embeddings(self, texts: List[str], batch_size: int = 30) -> List[List[float]]:
        """
        Generate embeddings for a list of texts in batches.
        """
        if not texts:
            return []

        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            formatted_contents = [
                types.Content(parts=[types.Part.from_text(text=t)])
                for t in batch
            ]

            try:
                response = self._embed_with_retry(
                    model=self.model,
                    contents=formatted_contents
                )
                if not response.embeddings:
                    raise RuntimeError(f"Embedding API returned empty results for batch offset {i}.")

                for emb in response.embeddings:
                    all_embeddings.append(emb.values)

                # Brief pause between batches to reduce quota spikes.
                if i + batch_size < len(texts):
                    time.sleep(1.5)
            except EmbeddingQuotaError:
                raise
            except Exception as e:
                logger.error(f"Error generating batch embeddings at offset {i}: {str(e)}")
                raise

        return all_embeddings

