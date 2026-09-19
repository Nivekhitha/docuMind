import axios from 'axios';

// Uses the Vite proxy in development or VITE_API_URL when configured.
const API_BASE = import.meta.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // LLM requests can take longer than normal API calls
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health
  getHealth: async () => {
    const res = await client.get('/api/health');
    return res.data;
  },

  // Documents
  getDocuments: async () => {
    const res = await client.get('/api/documents');
    return res.data;
  },

  getDocument: async (documentId) => {
    const res = await client.get(`/api/documents/${documentId}`);
    return res.data;
  },

  uploadDocument: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },

  deleteDocument: async (documentId) => {
    const res = await client.delete(`/api/documents/${documentId}`);
    return res.data;
  },

  // RAG Chat
  sendChatMessage: async (question, documentId = null, topK = 5) => {
    const res = await client.post('/api/chat', {
      question,
      document_id: documentId || undefined,
      top_k: topK,
    });
    return res.data;
  },

  // Analysis
  getDocumentSummary: async (documentId) => {
    const res = await client.post(`/api/documents/${documentId}/summary`);
    return res.data;
  },

  getDocumentQuiz: async (documentId) => {
    const res = await client.post(`/api/documents/${documentId}/quiz`);
    return res.data;
  },

  getDocumentFlashcards: async (documentId) => {
    const res = await client.post(`/api/documents/${documentId}/flashcards`);
    return res.data;
  },

  compareDocuments: async (docId1, docId2, topic = null) => {
    const res = await client.post('/api/compare', {
      doc_id_1: docId1,
      doc_id_2: docId2,
      topic: topic || undefined,
    });
    return res.data;
  },
};
