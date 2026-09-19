import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  FileText,
  Bookmark
} from 'lucide-react';
import { api } from '../services/api';

export default function ChatView({ documents, initialDocId }) {
  const [selectedDocId, setSelectedDocId] = useState(initialDocId || '');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! I am DocuMind. Ask any question about your uploaded documents, and I'll answer grounded strictly in the text with page-level citations.",
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [expandedCitations, setExpandedCitations] = useState({});

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  const toggleCitation = (msgId) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSend = async (customText = null) => {
    const query = (customText || question).trim();
    if (!query || loading) return;

    setErrorMsg(null);
    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(newMessages);
    setQuestion('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(query, selectedDocId || null, 5);
      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages([
        ...newMessages,
        {
          id: assistantMessageId,
          role: 'assistant',
          text: response.answer,
          citations: response.citations || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setErrorMsg("Unable to get an answer right now. Please try again.");
      setMessages([
        ...newMessages,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          isError: true,
          text: "Unable to get an answer right now. Please try again.",
          citations: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        text: "Chat cleared. What else would you like to research?",
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMsg(null);
  };

  const suggestedQuestions = [
    "What are the central conclusions and main arguments?",
    "Summarize the key findings and data points.",
    "What methodology or framework does the document follow?",
    "What are the most notable recommendations made?",
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-stone-900">Document Chat</h1>
            <p className="text-xs text-stone-500">Answers are based on your documents and include page references.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="text-xs font-medium bg-stone-50 border border-stone-200 text-stone-800 rounded-md py-1.5 pl-2.5 pr-8 focus:outline-none focus:border-blue-400"
            >
              <option value="">All Ready Documents</option>
              {readyDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename} ({doc.page_count} pgs)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={clearChat}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Clear chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const hasCitations = msg.citations && msg.citations.length > 0;
          const isExpanded = expandedCitations[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-stone-900 text-white rounded-br-xs'
                    : msg.isError
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs'
                    : 'bg-white text-stone-900 border border-stone-200 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                
                {hasCitations && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100">
                    <button
                      onClick={() => toggleCitation(msg.id)}
                      className="flex items-center space-x-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{msg.citations.length} Source Citation{msg.citations.length > 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {msg.citations.map((cite, idx) => (
                          <div
                            key={idx}
                            className="bg-stone-50 border border-stone-200/80 rounded-md p-2.5 text-xs text-stone-700 space-y-1"
                          >
                            <div className="flex items-center justify-between font-medium text-stone-900">
                              <span className="truncate max-w-[240px] flex items-center space-x-1">
                                <FileText className="w-3 h-3 text-stone-500 inline mr-1" />
                                {cite.document}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-stone-200/80 text-stone-700 text-[10px]">
                                Page {cite.page}
                              </span>
                            </div>
                            <p className="text-stone-600 text-[11px] italic font-serif leading-normal bg-white p-1.5 rounded border border-stone-100">
                              "{cite.snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-stone-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        
        {loading && (
          <div className="flex items-center space-x-2 bg-white border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-500 w-fit shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            <span>Searching your documents and preparing an answer...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && readyDocuments.length > 0 && (
        <div className="py-2">
          <p className="text-xs font-medium text-stone-500 mb-1.5">Suggested Questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((sq, i) => (
              <button
                key={i}
                onClick={() => handleSend(sq)}
                className="text-xs bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-full transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2">
        {readyDocuments.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center text-xs text-amber-800">
            No ready documents found. Please upload a PDF in the <strong>Documents</strong> tab first.
          </div>
        ) : (
          <div className="flex items-center space-x-2 bg-white border border-stone-200 rounded-xl p-2 shadow-xs focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                selectedDocId
                  ? `Ask a question about this document...`
                  : `Ask a question across all documents...`
              }
              className="flex-1 text-sm bg-transparent border-none resize-none focus:outline-none px-2 py-1 placeholder-stone-400 text-stone-800"
            />
            <button
              onClick={() => handleSend()}
              disabled={!question.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-stone-200 disabled:text-stone-400 text-white p-2 rounded-lg transition-colors shrink-0"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
