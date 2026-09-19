import React, { useState } from 'react';
import { 
  GitCompare, 
  Sparkles, 
  FileText, 
  AlertCircle, 
  ArrowRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

export default function CompareView({ documents }) {
  const [doc1Id, setDoc1Id] = useState('');
  const [doc2Id, setDoc2Id] = useState('');
  const [topic, setTopic] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  const handleCompare = async () => {
    if (!doc1Id || !doc2Id) return;
    if (doc1Id === doc2Id) {
      setErrorMsg("Please select two distinct documents to compare.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCompareData(null);

    try {
      const data = await api.compareDocuments(doc1Id, doc2Id, topic.trim() || null);
      setCompareData(data);
    } catch (err) {
      setErrorMsg("Unable to compare documents right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const doc1 = readyDocuments.find((d) => d.id === doc1Id);
  const doc2 = readyDocuments.find((d) => d.id === doc2Id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-stone-900">Compare Documents</h1>
            <p className="text-xs text-stone-500">
              Compare both documents side-by-side to identify key contrasts, shared themes, and unique takeaways.
            </p>
          </div>
        </div>
      </div>

      
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Select Two Documents to Compare
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>First Document</span>
            </label>
            <select
              value={doc1Id}
              onChange={(e) => {
                setDoc1Id(e.target.value);
                setCompareData(null);
                setErrorMsg(null);
              }}
              className="w-full text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-lg p-2.5 focus:outline-none focus:border-rose-400"
            >
              <option value="">Select Document A...</option>
              {readyDocuments.map((doc) => (
                <option key={doc.id} value={doc.id} disabled={doc.id === doc2Id}>
                  {doc.filename} ({doc.page_count} pgs)
                </option>
              ))}
            </select>
          </div>

          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Second Document</span>
            </label>
            <select
              value={doc2Id}
              onChange={(e) => {
                setDoc2Id(e.target.value);
                setCompareData(null);
                setErrorMsg(null);
              }}
              className="w-full text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-lg p-2.5 focus:outline-none focus:border-rose-400"
            >
              <option value="">Select Document B...</option>
              {readyDocuments.map((doc) => (
                <option key={doc.id} value={doc.id} disabled={doc.id === doc1Id}>
                  {doc.filename} ({doc.page_count} pgs)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-stone-700">
            Comparison Focus / Specific Question (Optional)
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Compare the methodologies, or what do they each conclude about scalability?"
            className="w-full text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-lg p-2.5 placeholder-stone-400 focus:outline-none focus:border-rose-400"
          />
        </div>


        <div className="pt-2 flex justify-end">
          <button
            id="compare-docs-btn"
            onClick={handleCompare}
            disabled={!doc1Id || !doc2Id || loading}
            className="bg-rose-700 hover:bg-rose-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-2xs flex items-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Analyzing both documents...' : 'Compare Documents'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-xs space-y-3">
          <div className="inline-block p-3 rounded-full bg-rose-50 text-rose-600 animate-pulse">
            <Clock className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-semibold text-stone-800">Comparing documents...</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Extracting representative sections from {doc1?.filename} and {doc2?.filename} to evaluate similarities, contrasts, and unique claims...
          </p>
        </div>
      )}

      {errorMsg && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm text-rose-800 font-medium">{errorMsg}</p>
          <button
            onClick={handleCompare}
            className="text-xs font-medium bg-white text-rose-700 border border-rose-300 px-3 py-1.5 rounded-md hover:bg-rose-100/50"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !compareData && !errorMsg && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-800">No comparison generated</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
            {readyDocuments.length < 2 
              ? "You need at least two ready PDF documents in your library to use comparison."
              : "Select two documents above and click Compare Documents to contrast their contents."}
          </p>
        </div>
      )}

      {compareData && !loading && (
        <div className="space-y-6">
          {/* Side-by-side key takeaways */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Doc 1 Takeaways */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <h3 className="text-sm font-bold text-stone-900 truncate" title={compareData.doc_1_name}>
                  {compareData.doc_1_name}
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-stone-700">
                {(compareData.doc_1_key_takeaways || []).map((t, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="text-sm font-bold text-stone-900 truncate" title={compareData.doc_2_name}>
                  {compareData.doc_2_name}
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-stone-700">
                {(compareData.doc_2_key_takeaways || []).map((t, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>


          <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                Compare Documents
              </span>
              <h3 className="text-lg font-bold font-serif text-stone-900 mt-1">
                Synthesized Cross-Document Comparison
              </h3>
              {compareData.topic && (
                <p className="text-xs text-stone-500 mt-0.5">
                  Focus topic: <span className="font-semibold text-stone-700">{compareData.topic}</span>
                </p>
              )}
            </div>

            <div className="prose prose-stone max-w-none text-sm text-stone-800 leading-relaxed space-y-3 font-serif whitespace-pre-wrap">
              {compareData.comparison}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
