import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertCircle, 
  FileText,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

export default function SummaryView({ documents, initialDocId }) {
  const [selectedDocId, setSelectedDocId] = useState(initialDocId || '');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  const handleGenerateSummary = async () => {
    if (!selectedDocId || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setSummaryData(null);

    try {
      const data = await api.getDocumentSummary(selectedDocId);
      setSummaryData(data);
    } catch (err) {
      setErrorMsg("Unable to create the summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData) return;
    const textToCopy = `SUMMARY: ${summaryData.filename}\n\n${summaryData.summary}\n\nKEY TAKEAWAYS:\n${(summaryData.key_points || []).map((p) => `• ${p}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeDoc = readyDocuments.find((d) => d.id === selectedDocId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-stone-900">Document Summary</h1>
            <p className="text-xs text-stone-500">
              Generates executive summaries and key findings using efficient hierarchical synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              setSummaryData(null);
              setErrorMsg(null);
            }}
            className="text-xs font-medium bg-white border border-stone-200 text-stone-800 rounded-md py-2 px-3 focus:outline-none focus:border-emerald-400"
          >
            <option value="">Select Document...</option>
            {readyDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename} ({doc.page_count} pgs)
              </option>
            ))}
          </select>

          <button
            id="generate-summary-btn"
            onClick={handleGenerateSummary}
            disabled={!selectedDocId || loading}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors shadow-2xs shrink-0 flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Creating summary...' : 'Generate Summary'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-xs space-y-3">
          <div className="inline-block p-3 rounded-full bg-emerald-50 text-emerald-600 animate-pulse">
            <Clock className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-semibold text-stone-800">Creating summary...</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {activeDoc && activeDoc.chunk_count > 12 
              ? `Processing ${activeDoc.chunk_count} chunks with hierarchical summary analysis...` 
              : "Analyzing document chunks with Gemini 3.6 Flash..."}
          </p>
        </div>
      )}

      {errorMsg && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm text-rose-800 font-medium">{errorMsg}</p>
          <button
            onClick={handleGenerateSummary}
            className="text-xs font-medium bg-white text-rose-700 border border-rose-300 px-3 py-1.5 rounded-md hover:bg-rose-100/50"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !summaryData && !errorMsg && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-800">No summary generated yet</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
            Choose a document from the dropdown above and click <strong>Generate Summary</strong> to extract high-level themes, conclusions, and core takeaways.
          </p>
        </div>
      )}

      {summaryData && !loading && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                Grounded Summary
              </span>
              <h2 className="text-lg font-bold font-serif text-stone-900 mt-1">
                {summaryData.filename}
              </h2>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-md border border-stone-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>
          </div>

          <div className="prose prose-stone max-w-none text-sm text-stone-800 leading-relaxed space-y-3 font-serif">
            {summaryData.summary.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {summaryData.key_points && summaryData.key_points.length > 0 && (
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Key Takeaways
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {summaryData.key_points.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2.5 p-3 rounded-lg bg-stone-50 border border-stone-100 text-xs text-stone-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
