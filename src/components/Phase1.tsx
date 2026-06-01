import React, { useState } from 'react';
import { useStore } from '../store';
import { MapPin, Calendar, DollarSign, Navigation } from 'lucide-react';

export const Phase1: React.FC = () => {
  const { setIntent, setStep } = useStore();
  const [form, setForm] = useState({
    origin: '',
    destination: 'San Francisco, CA',
    dates: '',
    budget: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIntent(form);
    setStep(2);
  };

  return (
    <div className="glass-panel animate-fade-in form-container">
      <h2 className="form-title">Plan Your Next Adventure</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            <Navigation size={16} /> Where From?
          </label>
          <input 
            type="text" 
            required
            className="input-field" 
            placeholder="e.g. New York, NY"
            value={form.origin}
            onChange={(e) => setForm({...form, origin: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            <MapPin size={16} /> Where To?
          </label>
          <input 
            type="text" 
            required
            className="input-field" 
            placeholder="e.g. San Francisco, CA"
            value={form.destination}
            onChange={(e) => setForm({...form, destination: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <Calendar size={16} /> Dates
          </label>
          <input 
            type="text" 
            required
            className="input-field" 
            placeholder="e.g. Tomorrow"
            value={form.dates}
            onChange={(e) => setForm({...form, dates: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <DollarSign size={16} /> Budget Tier
          </label>
          <select 
            className="input-field"
            value={form.budget}
            onChange={(e) => setForm({...form, budget: e.target.value})}
          >
            <option value="">Any</option>
            <option value="free">Free</option>
            <option value="low">Low ($)</option>
            <option value="medium">Medium ($$)</option>
            <option value="high">High ($$$)</option>
          </select>
        </div>

        <button type="submit" className="btn w-full mt-6">
          Continue
        </button>
      </form>
    </div>
  );
};
