import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DocumentsView from './pages/DocumentsView';
import ChatView from './pages/ChatView';
import SummaryView from './pages/SummaryView';
import QuizView from './pages/QuizView';
import FlashcardsView from './pages/FlashcardsView';
import CompareView from './pages/CompareView';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('documents');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [stats, setStats] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);


  const fetchDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const docs = await api.getDocuments();
      setDocuments(docs || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setStats(data);
    } catch (err) {
      console.warn('Backend health check warning:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchHealth();
  }, [fetchDocuments, fetchHealth]);

// Keep the document list updated while files are being processed.
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const docs = await api.getDocuments();
        setDocuments(docs || []);
        fetchHealth();
      } catch (e) {
        console.error('Poll error', e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, fetchHealth]);


  const handleUpload = async (file) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      await api.uploadDocument(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      // Refresh immediately so the new document appears as processing.
      await fetchDocuments();
      await fetchHealth();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload document. Please verify the file is a valid PDF under 25MB.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  
  const handleDelete = async (docId) => {
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocId === docId) {
        setSelectedDocId('');
      }
      fetchHealth();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleSelectDocForAction = (docId, actionTab) => {
    setSelectedDocId(docId);
    setActiveTab(actionTab);
  };

  const handleQuickUploadClick = () => {
    if (activeTab !== 'documents') {
      setActiveTab('documents');
    }
    setTimeout(() => {
      document.getElementById('file-upload-input')?.click();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans selection:bg-stone-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onQuickUpload={handleQuickUploadClick}
      />

      <main className="flex-1">
        {activeTab === 'documents' && (
          <DocumentsView
            documents={documents}
            loading={loadingDocs}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onSelectDocForAction={handleSelectDocForAction}
            onRefresh={() => {
              fetchDocuments();
              fetchHealth();
            }}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            documents={documents}
            initialDocId={selectedDocId}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryView
            documents={documents}
            initialDocId={selectedDocId}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizView
            documents={documents}
            initialDocId={selectedDocId}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsView
            documents={documents}
            initialDocId={selectedDocId}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            documents={documents}
          />
        )}
      </main>
    </div>
  );
}
