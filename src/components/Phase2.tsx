import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { initAI, generateQuestionnaire } from '../ai';
import { fetchPOIs } from '../tripEngine';
import { Loader2 } from 'lucide-react';

export const Phase2: React.FC = () => {
  const { intent, questions, setQuestions, answers, setAnswer, setStep, loadingStatus, setLoadingStatus } = useStore();
  const [isGenerating, setIsGenerating] = useState(true);

  const initRef = React.useRef(false);

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
        const generatedQs = await generateQuestionnaire(engine, intent, categories);
        
        setQuestions(generatedQs);
        setIsGenerating(false);
      } catch (e) {
        console.error(e);
        setIsGenerating(false);
      }
    };
    setup();
  }, [intent, setQuestions, setLoadingStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3); // Go to Assembly
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
                    required
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
          Generate Itinerary
        </button>
      </form>
    </div>
  );
};
