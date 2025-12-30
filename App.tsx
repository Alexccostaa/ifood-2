
import React, { useState, useEffect, useCallback } from 'react';
import { getMerchants, getCredentials, saveCredentials, clearCredentials } from './services/ifoodService';
import { Merchant, IFoodCredentials } from './types';
import { RestaurantCard } from './components/RestaurantCard';
import { CertificationCenter } from './components/CertificationCenter';
import { requestNotificationPermission } from './services/notificationService';
// Added missing 'Play' icon to imports
import { RefreshCw, Bell, ShieldCheck, Activity, AlertCircle, ShoppingBag, Settings, Key, LogOut, X, Terminal, Play } from 'lucide-react';

const SetupView: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    saveCredentials({ clientId, clientSecret });
    setTimeout(() => {
      setLoading(false);
      onComplete();
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white animate-in fade-in duration-500">
      <div className="bg-red-50 p-4 rounded-3xl mb-6">
        <ShoppingBag className="h-10 w-10 text-red-600" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Connect your Stores</h2>
      <p className="text-sm text-gray-500 text-center mb-8 px-4">
        Enter your iFood Developer credentials to monitor your restaurants in real-time.
      </p>
      
      <form onSubmit={handleConnect} className="w-full space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Client ID</label>
          <div className="relative">
            <Key className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
            <input 
              required
              type="text" 
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="Your client_id"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Client Secret</label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
            <input 
              required
              type="password" 
              value={clientSecret}
              onChange={e => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
            />
          </div>
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "CONNECT MERCHANT API"}
        </button>
      </form>
      
      <p className="mt-8 text-[10px] text-gray-400 text-center leading-relaxed">
        Keys are stored locally in your browser cache.<br/>
        Visit <a href="https://developer.ifood.com.br" className="text-red-500 font-bold underline">developer.ifood.com.br</a> to get credentials.
      </p>
    </div>
  );
};

const App: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(!!getCredentials());
  const [showSettings, setShowSettings] = useState(false);
  const [showCertification, setShowCertification] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isSetup) return;
    setLoading(true);
    try {
      const data = await getMerchants();
      setMerchants(data);
    } catch (error) {
      console.error("Failed to load merchants", error);
    } finally {
      setLoading(false);
    }
  }, [isSetup]);

  useEffect(() => {
    if (isSetup) {
      fetchData();
    }
    const initNotifications = async () => {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    };
    initNotifications();
  }, [fetchData, isSetup]);

  const handleDisconnect = () => {
    clearCredentials();
    setIsSetup(false);
    setShowSettings(false);
    setMerchants([]);
  };

  if (!isSetup) {
    return <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto shadow-2xl"><SetupView onComplete={() => setIsSetup(true)} /></div>;
  }

  const anomalyCount = merchants.filter(m => m.status !== m.expectedStatus).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Certification Overlay */}
      {showCertification && <CertificationCenter onClose={() => setShowCertification(false)} />}

      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/40 z-[100] animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-900">API Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-50 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => { setShowCertification(true); setShowSettings(false); }}
                className="w-full flex items-center justify-between p-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <Terminal className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-black">Certification Helper</p>
                    <p className="text-[10px] text-gray-400">Run mandatory iFood approval tests</p>
                  </div>
                </div>
                <Play className="h-4 w-4 opacity-50" />
              </button>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Connected As</p>
                  <p className="text-sm font-bold text-gray-900">iFood Developer Account</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>
              
              <button 
                onClick={handleDisconnect}
                className="w-full flex items-center justify-center gap-2 p-4 text-red-600 bg-red-50 font-black text-sm rounded-2xl hover:bg-red-100 transition-colors"
              >
                <LogOut className="h-4 w-4" /> DISCONNECT API
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ultra Compact Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-sm font-black text-gray-900 tracking-tight">IF MERCHANT</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-900"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button 
            onClick={() => requestNotificationPermission().then(setNotificationsEnabled)}
            className={`p-1.5 rounded-full ${notificationsEnabled ? 'text-green-500 bg-green-50' : 'text-gray-300 hover:text-orange-500'}`}
          >
            <Bell className="h-4 w-4" />
          </button>
          <button 
            onClick={fetchData}
            disabled={loading}
            className={`p-1.5 rounded-full bg-gray-100 text-gray-600 ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* High-Density Summary Strip */}
      <section className="bg-white px-4 py-2 border-b border-gray-100 flex gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 shrink-0">
          <Activity className="h-3 w-3 text-blue-500" />
          <span className="text-[10px] font-bold text-gray-500">STORES: <span className="text-gray-900">{merchants.length}</span></span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <AlertCircle className={`h-3 w-3 ${anomalyCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-300'}`} />
          <span className="text-[10px] font-bold text-gray-500">ALERTS: <span className={anomalyCount > 0 ? 'text-red-600' : 'text-gray-900'}>{anomalyCount}</span></span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <ShieldCheck className="h-3 w-3 text-green-500" />
          <span className="text-[10px] font-bold text-green-700">GEMINI GUARD ACTIVE</span>
        </div>
      </section>

      {/* Main List */}
      <main className="flex-1 overflow-y-auto bg-white">
        {loading && merchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-10 text-center">
            <RefreshCw className="h-8 w-8 text-red-600 animate-spin mb-4" />
            <p className="text-sm font-black text-gray-900">Synchronizing with iFood...</p>
            <p className="text-xs text-gray-400 mt-1 italic">Verifying real-time operational state</p>
          </div>
        ) : merchants.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
             <AlertCircle className="h-10 w-10 text-gray-200 mb-4" />
             <p className="text-sm font-bold text-gray-400 italic">No active merchants found on this account.</p>
           </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {merchants.map((merchant) => (
              <RestaurantCard 
                key={merchant.id} 
                merchant={merchant} 
                onRefresh={fetchData} 
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Footer */}
      <nav className="bg-white border-t border-gray-100 px-6 py-2 flex justify-around items-center">
        <button className="flex flex-col items-center text-red-600 p-1">
          <Activity className="h-5 w-5" />
          <span className="text-[8px] font-black mt-0.5 uppercase tracking-tighter">Status</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 p-1">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[8px] font-black mt-0.5 uppercase tracking-tighter">Security</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 p-1">
          <RefreshCw className="h-5 w-5" />
          <span className="text-[8px] font-black mt-0.5 uppercase tracking-tighter">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
