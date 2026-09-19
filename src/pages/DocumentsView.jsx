import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  MessageSquare, 
  BookOpen, 
  HelpCircle, 
  Layers,
  ArrowRight,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { formatFileSize, formatDate } from '../utils/formatters';

export default function DocumentsView({ 
  documents, 
  loading, 
  onUpload, 
  onDelete, 
  onSelectDocForAction,
  onRefresh,
  uploading,
  uploadProgress
}) {
  const [dragOver, setDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are supported. Please choose a .pdf document.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB limit. Please upload a smaller PDF or compress it.');
      return;
    }
    onUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Document Library
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Upload research papers, reports, or full books to extract, index, and query with grounded AI.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 text-xs font-medium text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 px-3 py-2 rounded-md shadow-2xs transition-colors"
            title="Refresh document status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-stone-800 bg-stone-50' 
              : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
            id="file-upload-input"
          />

          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-700 mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-stone-800">
            Click to upload PDF or drag and drop
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Supports research papers, textbooks, and reports up to 25MB.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-stone-500">
            <span className="px-2 py-0.5 rounded bg-stone-200/60 font-medium text-stone-700">PyMuPDF Extraction</span>
            <span className="px-2 py-0.5 rounded bg-stone-200/60 font-medium text-stone-700">Gemini Embeddings</span>
            <span className="px-2 py-0.5 rounded bg-stone-200/60 font-medium text-stone-700">ChromaDB Vector Store</span>
          </div>

          {uploading && (
            <div className="mt-6 max-w-sm mx-auto space-y-2">
              <div className="flex justify-between text-xs text-stone-600 font-medium">
                <span>Uploading PDF...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-stone-900 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-stone-900">Your Documents</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium">
              {documents.length}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-stone-200 rounded-md placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            />
          </div>
        </div>

        {documents.length === 0 && !loading && (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-800">No documents uploaded yet</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
              Upload your first PDF document above. It will be indexed into ChromaDB with Gemini embeddings for instant questions, quizzes, and summaries.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isProcessing = doc.status === 'processing';
            const isReady = doc.status === 'ready';
            const isError = doc.status === 'error';

            return (
              <div
                key={doc.id}
                id={`doc-card-${doc.id}`}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>

                    {isProcessing && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Processing...</span>
                      </span>
                    )}

                    {isReady && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready ✓</span>
                      </span>
                    )}

                    {isError && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200" title={doc.error_message}>
                        <AlertCircle className="w-3 h-3" />
                        <span>Error</span>
                      </span>
                    )}
                  </div>

                
                  <div className="mt-3">
                    <h3 
                      className="text-sm font-semibold text-stone-900 break-all line-clamp-2"
                      title={doc.filename}
                    >
                      {doc.filename}
                    </h3>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Uploaded {formatDate(doc.created_at)}
                    </p>
                  </div>

                  
                  <div className="mt-3 flex items-center space-x-3 text-xs text-stone-600 bg-stone-50 p-2 rounded-md border border-stone-100">
                    <div>
                      <span className="font-semibold text-stone-900">{formatFileSize(doc.file_size)}</span>
                    </div>
                    <span className="text-stone-300">|</span>
                    <div>
                      <span className="font-semibold text-stone-900">{doc.page_count || 0}</span> pages
                    </div>
                    <span className="text-stone-300">|</span>
                    <div>
                      <span className="font-semibold text-stone-900">{doc.chunk_count || 0}</span> chunks
                    </div>
                  </div>

                
                  {isError && doc.error_message && (
                    <div className="mt-2 text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                      {doc.error_message}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  {isReady ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onSelectDocForAction(doc.id, 'chat')}
                        title="Chat with this document"
                        className="p-1.5 rounded text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectDocForAction(doc.id, 'summary')}
                        title="Generate Summary"
                        className="p-1.5 rounded text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectDocForAction(doc.id, 'quiz')}
                        title="Generate Quiz"
                        className="p-1.5 rounded text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectDocForAction(doc.id, 'flashcards')}
                        title="Generate Flashcards"
                        className="p-1.5 rounded text-stone-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-stone-400 italic">
                      {isProcessing ? 'Vector indexing in progress...' : 'Failed'}
                    </div>
                  )}

                  <div>
                    {deleteConfirmId === doc.id ? (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            onDelete(doc.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(doc.id)}
                        className="p-1.5 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete document and vector index"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
