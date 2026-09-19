import React from 'react';
import { 
  MessageSquare, 
  FileText, 
  BookOpen, 
  HelpCircle, 
  Layers, 
  GitCompare,
  UploadCloud,
  CheckCircle2,
  Database
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  stats, 
  onQuickUpload 
}) {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, accent: 'text-blue-600', activeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'documents', label: 'Documents', icon: FileText, accent: 'text-stone-600', activeBg: 'bg-stone-100 text-stone-800 border-stone-300' },
    { id: 'summary', label: 'Summary', icon: BookOpen, accent: 'text-emerald-600', activeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle, accent: 'text-orange-600', activeBg: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, accent: 'text-amber-600', activeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'compare', label: 'Compare', icon: GitCompare, accent: 'text-rose-600', activeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  ];

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('documents')}>
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
              D
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-stone-900 font-serif">DocuMind</span>
                <span className="text-[11px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                  RAG Assistant
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">AI Document Research & Study Desk</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                    isActive 
                      ? item.activeBg 
                      : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? item.accent : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action & Stats */}
          <div className="flex items-center space-x-3">
            {stats && (
              <div className="hidden lg:flex items-center space-x-2 text-xs text-stone-500 bg-stone-50 px-2.5 py-1.5 rounded-md border border-stone-200">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <Database className="w-3.5 h-3.5 text-stone-400" />
                <span>{stats.chroma_chunks || 0} chunks</span>
                <span className="text-stone-300">•</span>
                <span>{stats.documents_count || 0} docs</span>
              </div>
            )}

            <button
              id="header-upload-btn"
              onClick={onQuickUpload}
              className="flex items-center space-x-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-md transition-colors shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload PDF</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-stone-100 space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap border ${
                  isActive ? item.activeBg : 'border-transparent text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
