import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  Award,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

export default function QuizView({ documents, initialDocId }) {
  const [selectedDocId, setSelectedDocId] = useState(initialDocId || '');
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]); // array of { questionIdx, chosen, isCorrect }
  const [quizFinished, setQuizFinished] = useState(false);

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  const handleGenerateQuiz = async () => {
    if (!selectedDocId || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setQuizData(null);
    resetQuizState();

    try {
      const data = await api.getDocumentQuiz(selectedDocId);
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions generated.");
      }
      setQuizData(data);
    } catch (err) {
      setErrorMsg("Unable to generate the quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetQuizState = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setQuizFinished(false);
  };

  const handleSelectOption = (optIndex) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(optIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    const currentQ = quizData.questions[currentIdx];
    const isCorrect = selectedOption === currentQ.answer;

    setIsAnswerSubmitted(true);
    setUserAnswers((prev) => [
      ...prev,
      {
        questionIdx: currentIdx,
        chosen: selectedOption,
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < quizData.questions.length) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
    }
  };

  const scoreCount = userAnswers.filter((a) => a.isCorrect).length;
  const totalQuestions = quizData?.questions?.length || 0;
  const currentQuestion = quizData?.questions?.[currentIdx];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-200">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-stone-900">Document Quiz</h1>
            <p className="text-xs text-stone-500">
              Interactive multiple-choice questions grounded directly in your uploaded PDF.
            </p>
          </div>
        </div>


        <div className="flex items-center space-x-2">
          <select
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              setQuizData(null);
              setErrorMsg(null);
              resetQuizState();
            }}
            className="text-xs font-medium bg-white border border-stone-200 text-stone-800 rounded-md py-2 px-3 focus:outline-none focus:border-orange-400"
          >
            <option value="">Select Document...</option>
            {readyDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>

          <button
            id="generate-quiz-btn"
            onClick={handleGenerateQuiz}
            disabled={!selectedDocId || loading}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors shadow-2xs shrink-0 flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Generating quiz...' : 'Create Quiz'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-xs space-y-3">
          <div className="inline-block p-3 rounded-full bg-orange-50 text-orange-600 animate-pulse">
            <HelpCircle className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-semibold text-stone-800">Generating quiz...</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Extracting core arguments and formulating multiple-choice questions from document context...
          </p>
        </div>
      )}

      {errorMsg && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm text-rose-800 font-medium">{errorMsg}</p>
          <button
            onClick={handleGenerateQuiz}
            className="text-xs font-medium bg-white text-rose-700 border border-rose-300 px-3 py-1.5 rounded-md hover:bg-rose-100/50"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !quizData && !errorMsg && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-800">No quiz generated</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
            Select a document and click <strong>Create Quiz</strong> to test your reading comprehension.
          </p>
        </div>
      )}

      {quizData && !loading && !quizFinished && currentQuestion && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-3">
            <span className="font-semibold text-orange-700">
              Question {currentIdx + 1} of {totalQuestions}
            </span>
            <span>Score: {scoreCount} / {userAnswers.length}</span>
          </div>

          <h2 className="text-base font-semibold text-stone-900 leading-snug">
            {currentQuestion.question}
          </h2>

          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrectAnswer = optIdx === currentQuestion.answer;

              let btnStyle = "bg-stone-50 border-stone-200 hover:bg-stone-100/80 text-stone-800";

              if (isAnswerSubmitted) {
                if (isCorrectAnswer) {
                  btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-900 font-medium";
                } else if (isSelected && !isCorrectAnswer) {
                  btnStyle = "bg-rose-50 border-rose-300 text-rose-900";
                } else {
                  btnStyle = "bg-stone-50 border-stone-200 text-stone-400 opacity-60";
                }
              } else if (isSelected) {
                btnStyle = "bg-orange-50 border-orange-400 text-orange-950 font-medium";
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={isAnswerSubmitted}
                  className={`w-full text-left p-3.5 rounded-lg border text-sm flex items-start space-x-3 transition-colors ${btnStyle}`}
                >
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isAnswerSubmitted && isCorrectAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {isAnswerSubmitted && (
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200/80 space-y-1 text-xs">
              <span className="font-semibold text-stone-800">
                {selectedOption === currentQuestion.answer ? '✓ Correct!' : '✗ Incorrect.'}
              </span>
              <p className="text-stone-600">{currentQuestion.explanation}</p>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold px-5 py-2 rounded-md transition-colors shadow-2xs"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-5 py-2 rounded-md transition-colors flex items-center space-x-1.5 shadow-2xs"
              >
                <span>{currentIdx + 1 < totalQuestions ? 'Next Question' : 'View Results'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {quizFinished && (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center shadow-xs space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">Quiz Completed!</h2>
            <p className="text-xs text-stone-500 mt-1">Review your document comprehension results:</p>
          </div>

          <div className="inline-block p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div className="text-3xl font-bold font-serif text-stone-900">
              {scoreCount} <span className="text-stone-400 text-xl font-normal">/ {totalQuestions}</span>
            </div>
            <p className="text-xs font-medium text-stone-600 mt-1">
              {Math.round((scoreCount / (totalQuestions || 1)) * 100)}% Accuracy
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={resetQuizState}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-md transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Quiz</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
