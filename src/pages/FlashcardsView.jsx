import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Sparkles, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  LayoutGrid, 
  CreditCard,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

export default function FlashcardsView({ documents, initialDocId }) {
  const [selectedDocId, setSelectedDocId] = useState(initialDocId || '');
  const [cardsData, setCardsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState('deck'); // 'deck' | 'grid'

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  const handleGenerateCards = async () => {
    if (!selectedDocId || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setCardsData(null);
    setCurrentIndex(0);
    setIsFlipped(false);

    try {
      const data = await api.getDocumentFlashcards(selectedDocId);
      if (!data.cards || data.cards.length === 0) {
        throw new Error("No flashcards generated.");
      }
      setCardsData(data);
    } catch (err) {
      setErrorMsg("Unable to create the flashcards. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!cardsData?.cards) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1 < cardsData.cards.length ? prev + 1 : 0));
    }, 150);
  };

  const handlePrev = () => {
    if (!cardsData?.cards) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : cardsData.cards.length - 1));
    }, 150);
  };

  const handleRestart = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
  };

  const totalCards = cardsData?.cards?.length || 0;
  const currentCard = cardsData?.cards?.[currentIndex];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-stone-900">Study Flashcards</h1>
            <p className="text-xs text-stone-500">
              Key concepts, core definitions, and takeaways generated directly from your document.
            </p>
          </div>
        </div>


        <div className="flex items-center space-x-2">
          <select
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              setCardsData(null);
              setErrorMsg(null);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className="text-xs font-medium bg-white border border-stone-200 text-stone-800 rounded-md py-2 px-3 focus:outline-none focus:border-amber-400"
          >
            <option value="">Select Document...</option>
            {readyDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>

          <button
            id="generate-flashcards-btn"
            onClick={handleGenerateCards}
            disabled={!selectedDocId || loading}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors shadow-2xs shrink-0 flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Creating flashcards...' : 'Create Flashcards'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-xs space-y-3">
          <div className="inline-block p-3 rounded-full bg-amber-50 text-amber-600 animate-pulse">
            <Layers className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-semibold text-stone-800">Creating flashcards...</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Extracting definitions and fundamental principles across the document chunks...
          </p>
        </div>
      )}

      {errorMsg && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm text-rose-800 font-medium">{errorMsg}</p>
          <button
            onClick={handleGenerateCards}
            className="text-xs font-medium bg-white text-rose-700 border border-rose-300 px-3 py-1.5 rounded-md hover:bg-rose-100/50"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !cardsData && !errorMsg && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-800">No flashcards created</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
            Pick a ready document above and click <strong>Create Flashcards</strong> to generate review cards for rapid study and memorization.
          </p>
        </div>
      )}

      {cardsData && !loading && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-stone-200 text-xs">
            <div className="font-semibold text-amber-800">
              Card {currentIndex + 1} of {totalCards}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'deck' ? 'grid' : 'deck')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              >
                {viewMode === 'deck' ? <LayoutGrid className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                <span>{viewMode === 'deck' ? 'Grid View' : 'Card Deck'}</span>
              </button>
              <button
                onClick={handleRestart}
                className="p-1 rounded text-stone-400 hover:text-stone-700 transition-colors"
                title="Restart from beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {viewMode === 'deck' && currentCard && (
            <div className="space-y-6">
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer select-none group min-h-[300px] w-full bg-white rounded-2xl border-2 border-stone-200 hover:border-amber-400/80 p-8 flex flex-col justify-between shadow-xs transition-all"
              >
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-medium uppercase tracking-wider text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {isFlipped ? 'Answer / Back' : 'Question / Front'}
                  </span>
                  <span className="flex items-center space-x-1 text-stone-400 group-hover:text-amber-600 transition-colors">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Click card to flip</span>
                  </span>
                </div>

                <div className="my-auto py-8 text-center px-4">
                  {!isFlipped ? (
                    <div className="text-xl font-bold font-serif text-stone-900 leading-snug">
                      {currentCard.front}
                    </div>
                  ) : (
                    <div className="text-base font-normal text-stone-800 leading-relaxed max-w-xl mx-auto font-serif">
                      {currentCard.back}
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] text-stone-400">
                  {isFlipped ? 'Tap to review term' : 'Tap to reveal definition'}
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handlePrev}
                  className="flex items-center space-x-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  Flip Card
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center space-x-1 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cardsData.cards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-400">#{idx + 1}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Card
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 font-serif">
                    {card.front}
                  </h3>
                  <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100 leading-relaxed font-serif">
                    {card.back}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
