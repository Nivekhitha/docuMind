# DocuMind: AI Research & Document Assistant

# DocuMind

DocuMind is a web app for working with PDF documents using AI.

Upload a PDF, ask questions about its contents, generate summaries, create quizzes and flashcards, or compare two documents. Answers from document chat include page references so you can check the original source.

## Features

* 📄 PDF upload and text extraction
* 💬 Ask questions about your documents
* 🔎 RAG-based semantic search
* 📑 Page-level source citations
* 📝 Document summaries and key takeaways
* 🧠 AI-generated quizzes
* 🎴 Flashcards for studying
* 🔄 Compare two documents
* 📚 Support for larger documents through chunking and retrieval

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS

### Backend

* FastAPI
* PyMuPDF
* ChromaDB
* Google Gemini API

## How It Works

```text
PDF
 ↓
Text extraction
 ↓
Chunking
 ↓
Gemini embeddings
 ↓
ChromaDB
 ↓
Semantic retrieval
 ↓
Gemini
 ↓
Answer + page citations
```

When a document is uploaded, its text is extracted page by page and split into overlapping chunks. The chunks are converted into embeddings and stored in ChromaDB.

When you ask a question, DocuMind searches the relevant document chunks and sends the retrieved context to Gemini. The response is then returned with the source document and page number.

## Project Structure

```text
documind/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
├── public/
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

* Node.js
* Python 3.10+
* A Gemini API key

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd documind
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Configure environment variables

Create:

```text
backend/.env
```

and add:

```env
GEMINI_API_KEY=your_gemini_api_key

LLM_MODEL=your_llm_model
EMBEDDING_MODEL=your_embedding_model

HOST=127.0.0.1
PORT=8001
```

Do not commit your `.env` file.

### 5. Start the application

```bash
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

The FastAPI documentation is available at:

```text
http://localhost:8001/docs
```

## API

| Method | Endpoint                         | Description                   |
| ------ | -------------------------------- | ----------------------------- |
| GET    | `/api/health`                    | Check API health              |
| POST   | `/api/documents/upload`          | Upload a PDF                  |
| GET    | `/api/documents`                 | List documents                |
| GET    | `/api/documents/{id}`            | Get document status           |
| DELETE | `/api/documents/{id}`            | Delete a document             |
| POST   | `/api/chat`                      | Ask questions about documents |
| POST   | `/api/documents/{id}/summary`    | Generate a summary            |
| POST   | `/api/documents/{id}/quiz`       | Generate a quiz               |
| POST   | `/api/documents/{id}/flashcards` | Generate flashcards           |
| POST   | `/api/compare`                   | Compare documents             |

## Current Limitations

* PDF text extraction works best with text-based PDFs.
* Scanned documents may require OCR support.
* Vector storage currently uses local ChromaDB storage.
* Large documents can be affected by embedding API limits.
* Authentication and multi-user document isolation are not currently implemented.

## Future Improvements

* OCR support for scanned PDFs
* User authentication
* Cloud-based vector storage
* Streaming chat responses
* Better retrieval evaluation
* Persistent cloud document storage

## License

MIT
