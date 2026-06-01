import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { initAI, generateQuestionnaire } from '../ai';
import { fetchPOIs } from '../tripEngine';
import { Loader2 } from 'lucide-react';

export const Phase2: React.FC = () => {
  const { 
    intent, questions, setQuestions, answers, setAnswer, 
    setStep, loadingStatus, setLoadingStatus, 
    qnaHistory, addQnA, clearAnswers 
  } = useStore();
  
  const [isGenerating, setIsGenerating] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const setup = async () => {
      try {
        setLoadingStatus('Initializing AI Engine (this may take a moment to download weights)...');
        const engine = await initAI((progress) => {
          setLoadingStatus(`Loading AI: ${progress}`);
        });

        setLoadingStatus('Analyzing local destination data...');
        const pois = await fetchPOIs();
        const categories = [...new Set(pois.map(p => p.properties.category))];

        setLoadingStatus('Generating personalized questions...');
        const result = await generateQuestionnaire(engine, intent, categories, qnaHistory);
        
        if (result.isComplete || result.questions.length === 0) {
          setStep(3);
        } else {
          setQuestions(result.questions);
        }
        setIsGenerating(false);
      } catch (e) {
        console.error(e);
        setIsGenerating(false);
      }
    };
    setup();
  }, [intent, setQuestions, setLoadingStatus, qnaHistory, setStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure all displayed questions are answered
    const allAnswered = questions.every(q => answers[q.id]);
    if (!allAnswered) {
      alert("Please answer all questions before continuing.");
      return;
    }

    setIsGenerating(true);
    setLoadingStatus('Evaluating your preferences...');

    try {
      // Compile the current answers into the history
      const newHistoryItems = questions.map(q => ({
        question: q.question,
        answer: answers[q.id]
      }));
      
      addQnA(newHistoryItems);

      // Re-run generation with updated history
      const engine = await initAI(() => {});
      const pois = await fetchPOIs();
      const categories = [...new Set(pois.map(p => p.properties.category))];

      const updatedHistory = [...qnaHistory, ...newHistoryItems];
      const result = await generateQuestionnaire(engine, intent, categories, updatedHistory);

      if (result.isComplete || result.questions.length === 0) {
        setStep(3); // Transition to Assembly
      } else {
        setQuestions(result.questions);
        clearAnswers(); // Reset local form state for the new batch
        setIsGenerating(false);
      }
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="loading-container animate-fade-in">
        <Loader2 className="spinner" />
        <p style={{ color: '#d1d5db', textAlign: 'center', maxWidth: '28rem' }}>{loadingStatus}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in form-container">
      <h2 className="form-title">Customize Your Trip</h2>
      <p style={{textAlign: "center", marginBottom: "1rem", color: "var(--text-secondary)"}}>
        Step {Math.floor(qnaHistory.length / 3) + 1}
      </p>
      
      <form onSubmit={handleSubmit}>
        {questions.map((q, i) => (
          <div key={q.id || i} className="form-group">
            <label className="form-label" style={{ marginBottom: '0.75rem', fontSize: '1rem', color: '#f3f4f6' }}>
              {q.question}
            </label>
            <div className="radio-group">
              {q.options?.map(opt => (
                <label key={opt} className="radio-label">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                    className="radio-input"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <button type="submit" className="btn w-full mt-6">
          Continue
        </button>
      </form>
    </div>
  );
};
