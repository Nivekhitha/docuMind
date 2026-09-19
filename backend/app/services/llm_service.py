import json
import logging
import time
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from backend.app.config import GEMINI_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_RAG = (
    "Answer using only the provided document context. "
    "If the answer cannot be found in the provided context, clearly say that the information "
    "is not available in the uploaded documents. Do not invent facts."
)


class LLMService:
    def __init__(self, api_key: str = GEMINI_API_KEY, model: str = LLM_MODEL):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured in the environment.")
        self.client = genai.Client(api_key=api_key)
        self.model = model

    def _generate_with_retry(self, **kwargs):
        """Calls generate_content with automatic exponential backoff on transient 503/429 spikes."""
        max_attempts = 4
        last_error = None
        for attempt in range(max_attempts):
            try:
                return self.client.models.generate_content(**kwargs)
            except Exception as e:
                last_error = e
                err_str = str(e)
                if ("503" in err_str or "429" in err_str or "UNAVAILABLE" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < max_attempts - 1:
                    sleep_time = (attempt + 1) * 2
                    logger.warning(f"Gemini API transient spike (attempt {attempt+1}/{max_attempts}): {e}. Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)
                else:
                    raise e
        raise last_error

    def answer_question(self, question: str, context_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:

        if not context_chunks:
            return {
                "answer": "No relevant content was found in the uploaded documents to answer your question.",
                "citations": []
            }

        context_blocks = []
        citations = []

        for c in context_chunks:
            meta = c.get("metadata", {})
            page = meta.get("page_number", 1)
            filename = meta.get("filename", "Document")
            snippet = c.get("text", "")[:250].replace("\n", " ").strip()
            
            context_blocks.append(
                f"[Source: {filename}, Page {page}]\n{c.get('text', '')}"
            )
            citations.append({
                "document": filename,
                "page": page,
                "snippet": snippet + "..." if len(c.get("text", "")) > 250 else snippet
            })

        combined_context = "\n\n---\n\n".join(context_blocks)

        prompt = f"""DOCUMENT CONTEXT:
{combined_context}

QUESTION:
{question}

Please answer the question accurately and concisely based strictly on the above document context."""

        try:
            response = self._generate_with_retry(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT_RAG
                )
            )
            answer_text = response.text or "No answer could be generated."
            return {
                "answer": answer_text,
                "citations": citations
            }
        except Exception as e:
            logger.error(f"Error calling Gemini in answer_question: {e}")
            raise RuntimeError("Unable to get an answer right now. Please try again.")

    def summarize_document(self, chunks: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
        """
        Summarizes document content using an efficient hierarchical summarization strategy:
        1. For small documents (<= 12 chunks), uses a single-pass summary.
        2. For large documents / books (> 12 chunks, e.g. 200-300 pages), partitions the document
           into a small, bounded number of sequential sections (3 to 5 sections).
        3. Compresses/samples representative chunks for each section to avoid sending the whole document.
        4. Generates section summaries efficiently (1 call per section).
        5. Synthesizes section summaries into a final executive summary and key takeaways (1 reduce call).
        Total Gemini calls for a large book: 4 to 6 calls total (never dozens of sequential calls).
        """
        if not chunks:
            return {
                "summary": "This document has no readable text chunks to summarize.",
                "key_points": []
            }

       
        if len(chunks) <= 12:
            combined_text = "\n\n".join([f"(Page {c['metadata'].get('page_number', 1)}) {c['text']}" for c in chunks])
            prompt = f"""You are an expert document researcher. Summarize the following document titled "{filename}".

DOCUMENT TEXT:
{combined_text}

Provide:
1. A clear, well-structured multi-paragraph executive summary.
2. A list of 4-7 key takeaways or main arguments.

Output valid JSON in this exact structure:
{{
  "summary": "...",
  "key_points": ["point 1", "point 2", "point 3"]
}}"""
            try:
                response = self._generate_with_retry(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                data = json.loads(response.text)
                return data
            except Exception as e:
                logger.error(f"Summary generation failed: {e}")
                try:
                    plain_res = self._generate_with_retry(
                        model=self.model,
                        contents=f"Summarize the main themes and key findings of {filename}:\n\n{combined_text[:15000]}"
                    )
                    return {"summary": plain_res.text or "Summary generated.", "key_points": []}
                except Exception:
                    raise RuntimeError("Unable to create the summary. Please try again.")

        num_sections = min(5, max(3, len(chunks) // 20))
        logger.info(
            f"Using Hierarchical Summarization for large document: {filename} "
            f"({len(chunks)} chunks -> {num_sections} sections)"
        )

        section_size = len(chunks) / num_sections
        section_summaries: List[str] = []

        for idx in range(num_sections):
            start_idx = int(idx * section_size)
            end_idx = int((idx + 1) * section_size) if idx < num_sections - 1 else len(chunks)
            sec_chunks = chunks[start_idx:end_idx]

            if not sec_chunks:
                continue

            first_page = sec_chunks[0].get("metadata", {}).get("page_number", 1)
            last_page = sec_chunks[-1].get("metadata", {}).get("page_number", first_page)

            sample_sec_chunks = self._select_representative_chunks(sec_chunks, max_chunks=8)
            sec_text = "\n\n".join([
                f"[p.{c.get('metadata', {}).get('page_number', 1)}] {c.get('text', '')}"
                for c in sample_sec_chunks
            ])

            sec_prompt = f"""Summarize Section {idx + 1} of {num_sections} (covering pages {first_page} to {last_page}) of the document "{filename}".
Base your summary strictly on these representative excerpts from this section:

{sec_text}

Provide a concise 2-3 paragraph summary highlighting the main ideas, core methodologies, arguments, and conclusions of this section."""

            try:
                sec_res = self._generate_with_retry(
                    model=self.model,
                    contents=sec_prompt
                )
                if sec_res.text and sec_res.text.strip():
                    section_summaries.append(
                        f"Section {idx + 1} (Pages {first_page}-{last_page}):\n{sec_res.text.strip()}"
                    )
            except Exception as e:
                logger.warning(f"Error in hierarchical section {idx + 1}: {e}")

        if not section_summaries:
            sample_fallback = self._select_representative_chunks(chunks, max_chunks=12)
            fallback_text = "\n\n".join([c.get("text", "") for c in sample_fallback])
            section_summaries.append(fallback_text[:12000])

        # Step 2: Combine section summaries into the final comprehensive summary
        combined_sections = "\n\n--- SECTION BREAK ---\n\n".join(section_summaries)
        reduce_prompt = f"""You are an expert document researcher. Below are structured section summaries covering the complete large document/book titled "{filename}".
Synthesize them into a master comprehensive executive summary.

SECTION SUMMARIES:
{combined_sections}

Provide:
1. A thorough, well-organized executive summary covering the beginning, middle, and conclusion.
2. 5-8 major key takeaways.

Output valid JSON in this exact structure:
{{
  "summary": "...",
  "key_points": ["takeaway 1", "takeaway 2", "takeaway 3"]
}}"""

        try:
            reduce_res = self._generate_with_retry(
                model=self.model,
                contents=reduce_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(reduce_res.text)
        except Exception as e:
            logger.error(f"Hierarchical reduce step failed: {e}")
            try:
                plain_reduce = self._generate_with_retry(
                    model=self.model,
                    contents=f"Provide a comprehensive summary and key takeaways for {filename} based on these section notes:\n\n{combined_sections}"
                )
                plain_text = plain_reduce.text or ""
                return {
                    "summary": plain_text,
                    "key_points": [line.strip("- *• ") for line in plain_text.splitlines() if line.strip().startswith(("-", "*", "•"))][:6]
                }
            except Exception:
                raise RuntimeError("Unable to create the summary. Please try again.")

    def generate_quiz(self, chunks: List[Dict[str, Any]], filename: str) -> List[Dict[str, Any]]:
        """
        Generates 5 multiple-choice questions strictly from the document text.
        """
        if not chunks:
            raise ValueError("No content available to generate quiz.")

        # Sample representative chunks across the document
        sample_chunks = self._select_representative_chunks(chunks, max_chunks=15)
        combined_text = "\n\n".join([f"(Page {c['metadata'].get('page_number', 1)}) {c['text']}" for c in sample_chunks])

        prompt = f"""Create 5 multiple-choice questions to test understanding of the document "{filename}".
Base all questions and answers strictly on the text provided below.

DOCUMENT EXCERPTS:
{combined_text}

Rules:
1. Exactly 4 answer options per question.
2. The "answer" field must be the 0-based integer index (0, 1, 2, or 3) of the correct option.
3. Provide a clear, brief explanation grounded in the text.
4. Output valid JSON in this exact structure:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Explanation here."
    }}
  ]
}}"""

        try:
            response = self._generate_with_retry(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            data = json.loads(response.text)
            return data.get("questions", [])
        except Exception as e:
            logger.error(f"Quiz generation failed: {e}")
            raise RuntimeError("Unable to generate the quiz. Please try again.")

    def generate_flashcards(self, chunks: List[Dict[str, Any]], filename: str) -> List[Dict[str, Any]]:
        """
        Generates 8-10 educational flashcards for key definitions, principles, or findings.
        """
        if not chunks:
            raise ValueError("No content available to generate flashcards.")

        sample_chunks = self._select_representative_chunks(chunks, max_chunks=15)
        combined_text = "\n\n".join([f"(Page {c['metadata'].get('page_number', 1)}) {c['text']}" for c in sample_chunks])

        prompt = f"""Extract 8 to 10 key concepts, definitions, principles, or core facts from "{filename}" and turn them into concise study flashcards.

DOCUMENT EXCERPTS:
{combined_text}

Rules:
1. Front: A clear concept name, key question, or term.
2. Back: A crisp, understandable explanation or answer (2-4 sentences max).
3. Output valid JSON in this exact structure:
{{
  "cards": [
    {{
      "front": "Term or concept",
      "back": "Clear definition or explanation"
    }}
  ]
}}"""

        try:
            response = self._generate_with_retry(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            data = json.loads(response.text)
            return data.get("cards", [])
        except Exception as e:
            logger.error(f"Flashcard generation failed: {e}")
            raise RuntimeError("Unable to create the flashcards. Please try again.")

    def compare_documents(
        self,
        doc_1_name: str,
        doc_1_chunks: List[Dict[str, Any]],
        doc_2_name: str,
        doc_2_chunks: List[Dict[str, Any]],
        topic: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compares two documents on specific or general topics without exceeding token limits.
        """
        doc1_sample = self._select_representative_chunks(doc_1_chunks, max_chunks=10)
        doc2_sample = self._select_representative_chunks(doc_2_chunks, max_chunks=10)

        text1 = "\n\n".join([c["text"] for c in doc1_sample])
        text2 = "\n\n".join([c["text"] for c in doc2_sample])

        topic_instruction = f"Focus the comparison specifically on the topic: '{topic}'." if topic else "Provide a general thematic and substantive comparison."

        prompt = f"""Compare these two documents. {topic_instruction}

DOCUMENT 1: "{doc_1_name}"
{text1}

DOCUMENT 2: "{doc_2_name}"
{text2}

Analyze:
1. Key takeaways from Document 1.
2. Key takeaways from Document 2.
3. Detailed comparison outlining similarities, key differences, contrasting perspectives, and conclusions. Clearly identify which information comes from which document.

Output valid JSON in this exact structure:
{{
  "comparison": "Detailed comparison text in multiple well-formatted paragraphs...",
  "doc_1_key_takeaways": ["Point 1 from Doc 1", "Point 2 from Doc 1"],
  "doc_2_key_takeaways": ["Point 1 from Doc 2", "Point 2 from Doc 2"]
}}"""

        try:
            response = self._generate_with_retry(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Document comparison failed: {e}")
            raise RuntimeError("Unable to compare documents right now. Please try again.")

    def _select_representative_chunks(self, chunks: List[Dict[str, Any]], max_chunks: int = 15) -> List[Dict[str, Any]]:
        """
        Evenly distributes chunk samples across the entire document.
        """
        if len(chunks) <= max_chunks:
            return chunks
        step = len(chunks) / max_chunks
        return [chunks[int(i * step)] for i in range(max_chunks)]
