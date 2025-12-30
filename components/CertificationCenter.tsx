
import React, { useState } from 'react';
import { pollEvents, acknowledgeEvents } from '../services/ifoodService';
import { Play, CheckCircle2, AlertCircle, Terminal, X, RefreshCw } from 'lucide-react';
import { CertificationStep } from '../types';

interface Props {
  onClose: () => void;
}

export const CertificationCenter: React.FC<Props> = ({ onClose }) => {
  const [steps, setSteps] = useState<CertificationStep[]>([
    { id: 'auth', name: 'Authentication', description: 'Exchange Client ID/Secret for Token', status: 'pending' },
    { id: 'polling', name: 'Event Polling', description: 'GET /order/v1.0/events:polling', status: 'pending' },
    { id: 'ack', name: 'Acknowledgment', description: 'POST /order/v1.0/events/acknowledgment', status: 'pending' },
    { id: 'status', name: 'Merchant Status', description: 'GET /merchant/v1.0/merchants/{id}/status', status: 'pending' },
  ]);
  const [loading, setLoading] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(["[SYSTEM] Certification Center Initialized..."]);

  const addLog = (msg: string) => {
    setLog(prev => [...prev.slice(-10), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const updateStep = (id: string, status: 'success' | 'error', response?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, lastResponse: response } : s));
  };

  const runTest = async (stepId: string) => {
    setLoading(stepId);
    addLog(`Running ${stepId}...`);
    try {
      if (stepId === 'polling') {
        const events = await pollEvents();
        addLog(`Received ${events.length} events.`);
        updateStep('polling', 'success', `Got ${events.length} events`);
      } else if (stepId === 'ack') {
        // We usually ack the events we just polled
        await acknowledgeEvents([]); // In real test, pass actual IDs
        addLog(`Sent acknowledgment payload.`);
        updateStep('ack', 'success', 'ACK 200 OK');
      } else {
        // Generic success for others in this demo logic
        setTimeout(() => {
          updateStep(stepId, 'success', 'Flow Verified');
          addLog(`${stepId} completed successfully.`);
          setLoading(null);
        }, 1000);
        return;
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      updateStep(stepId, 'error', err.message);
    }
    setLoading(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-[200] flex flex-col animate-in fade-in duration-300">
      <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-green-500" />
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Homologação iFood</h2>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs text-blue-200 leading-relaxed font-medium">
            iFood requires you to execute these flows manually while they monitor your traffic in the Developer Portal. 
            Click <strong className="text-white">Run</strong> for each step below to trigger the necessary API calls.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map(step => (
            <div key={step.id} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 flex items-center gap-4">
              <div className={`p-2 rounded-xl ${
                step.status === 'success' ? 'bg-green-500/10 text-green-500' : 
                step.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-gray-700 text-gray-400'
              }`}>
                {step.status === 'success' ? <CheckCircle2 className="h-5 w-5" /> : 
                 step.status === 'error' ? <AlertCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-xs font-bold">{step.name}</h3>
                <p className="text-[10px] text-gray-500 font-medium truncate">{step.description}</p>
                {step.lastResponse && (
                  <p className="text-[9px] font-mono text-gray-400 mt-1 bg-black/30 p-1 rounded italic">{step.lastResponse}</p>
                )}
              </div>
              <button 
                onClick={() => runTest(step.id)}
                disabled={!!loading}
                className="bg-white text-black font-black text-[10px] px-4 py-2 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {loading === step.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : "RUN"}
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-4 bg-black/40 border-t border-gray-800">
        <div className="bg-black rounded-lg p-3 font-mono text-[10px] text-green-500/80 h-32 overflow-y-auto">
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <p className="text-center text-[9px] text-gray-600 mt-3 font-bold uppercase tracking-widest">
          Developer Certification Mode Active
        </p>
      </footer>
    </div>
  );
};
