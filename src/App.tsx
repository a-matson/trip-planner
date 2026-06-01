
import { useStore } from './store';
import { Phase1 } from './components/Phase1';
import { Phase2 } from './components/Phase2';
import { Phase3 } from './components/Phase3';
import { Phase4 } from './components/Phase4';
import './App.css';

function App() {
  const step = useStore((state) => state.step);

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo">Offline AI Planner</h1>
        <p className="subtitle">Zero-latency, fully client-side</p>
      </header>

      <main className="main-content">
        {step === 1 && <Phase1 />}
        {step === 2 && <Phase2 />}
        {step === 3 && <Phase3 />}
        {step === 4 && <Phase4 />}
      </main>
    </div>
  );
}

export default App;
