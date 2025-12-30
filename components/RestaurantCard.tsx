
import React, { useEffect, useState, useRef } from 'react';
import { Merchant, AnomalyReport, WorkingHour } from '../types';
import { StatusBadge } from './StatusBadge';
import { analyzeRestaurantStatus } from '../services/geminiService';
import { sendLocalNotification } from '../services/notificationService';
import { updateWorkingHours, schedulePause } from '../services/ifoodService';
import { 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  RefreshCw, 
  Clock, 
  Coffee, 
  Save, 
  X, 
  Calendar, 
  Timer, 
  Keyboard, 
  MousePointer2 
} from 'lucide-react';

interface Props {
  merchant: Merchant;
  onRefresh: () => void;
}

const TimeCarousel: React.FC<{ 
  selectedTime: string; 
  onSelect: (time: string) => void;
  label: string;
}> = ({ selectedTime, onSelect, label }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isManual, setIsManual] = useState(false);

  // Generate times every 15 minutes
  const times = Array.from({ length: 96 }, (_, i) => {
    const hours = Math.floor(i / 4).toString().padStart(2, '0');
    const minutes = ((i % 4) * 15).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  });

  useEffect(() => {
    if (!isManual && scrollRef.current) {
      const selectedElement = scrollRef.current.querySelector(`[data-time="${selectedTime}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedTime, isManual]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2 px-1">
        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</label>
        <div className="flex items-center gap-2">
          {isManual ? (
            <input 
              type="time" 
              value={selectedTime}
              onChange={(e) => onSelect(e.target.value)}
              className="text-[11px] font-bold text-red-600 bg-red-50 border-none rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-red-200"
            />
          ) : (
            <span className="text-[11px] font-black text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full shadow-sm shadow-red-100">
              {selectedTime}
            </span>
          )}
          <button 
            onClick={() => setIsManual(!isManual)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
            title={isManual ? "Switch to Carousel" : "Manual Input"}
          >
            {isManual ? <MousePointer2 className="h-3 w-3" /> : <Keyboard className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {!isManual ? (
        <div className="relative group">
          {/* Edge Fades for better visual cue */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div 
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth snap-x"
          >
            {times.map((t) => (
              <button
                key={t}
                data-time={t}
                onClick={() => onSelect(t)}
                className={`shrink-0 px-4 py-2 rounded-xl text-[11px] font-bold border transition-all snap-center ${
                  selectedTime === t 
                    ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200 scale-105 z-20' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-400 active:scale-95'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[44px] flex items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
           <p className="text-[10px] text-gray-400 italic">Precision mode active</p>
        </div>
      )}
    </div>
  );
};

export const RestaurantCard: React.FC<Props> = ({ merchant, onRefresh }) => {
  const [analysis, setAnalysis] = useState<AnomalyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'hours' | 'pause' | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [tempHours, setTempHours] = useState<WorkingHour[]>(merchant.hours);
  const [pauseDuration, setPauseDuration] = useState<number | null>(30);
  const [pauseStartTime, setPauseStartTime] = useState(() => {
    const d = new Date();
    const h = d.getHours().toString().padStart(2, '0');
    const m = (Math.round(d.getMinutes() / 15) * 15).toString().padStart(2, '0');
    return `${h}:${m === '60' ? '00' : m}`;
  });
  const [pauseEndTime, setPauseEndTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const h = d.getHours().toString().padStart(2, '0');
    const m = (Math.round(d.getMinutes() / 15) * 15).toString().padStart(2, '0');
    return `${h}:${m === '60' ? '00' : m}`;
  });

  useEffect(() => {
    const runAnalysis = async () => {
      setLoading(true);
      const result = await analyzeRestaurantStatus(merchant);
      setAnalysis(result);
      setLoading(false);

      if (result.isAnomaly && result.severity === 'high') {
        sendLocalNotification(
          `ALERT: ${merchant.name}`,
          result.reason || 'Unexpected operational state detected.'
        );
      }
    };
    runAnalysis();
  }, [merchant]);

  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-200';
    }
  };

  const handleSaveHours = async () => {
    setSaving(true);
    await updateWorkingHours(merchant.id, tempHours);
    setSaving(false);
    setActiveTab(null);
  };

  const handleSchedulePause = async () => {
    setSaving(true);
    let finalReason = "Owner manual pause";
    let finalDuration = pauseDuration || 60;

    if (!pauseDuration) {
       finalReason = `Custom pause: ${pauseStartTime} to ${pauseEndTime}`;
    }

    await schedulePause(merchant.id, finalDuration, finalReason);
    setSaving(false);
    setActiveTab(null);
  };

  return (
    <div className={`relative bg-white border-b border-gray-100 last:border-0 transition-all ${isExpanded ? 'bg-gray-50/30' : 'hover:bg-gray-50'}`}>
      {/* Clickable Header Area */}
      <div 
        className="p-3.5 flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Visual Indicator of Anomaly */}
        {analysis?.isAnomaly && (
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${getAlertStyles(analysis.severity)}`} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-[13px] font-bold text-gray-900 truncate pr-2">{merchant.name}</h3>
            <StatusBadge status={merchant.status} />
          </div>
          
          <div className="flex items-center text-[10px] text-gray-500 gap-2 font-medium">
            <div className="flex items-center truncate">
              <MapPin className="h-2.5 w-2.5 mr-0.5 shrink-0 opacity-70" />
              <span className="truncate">{merchant.address.split('-')[0]}</span>
            </div>
            <div className="flex items-center shrink-0">
              <Clock className="h-2.5 w-2.5 mr-0.5 shrink-0 opacity-70" />
              <span>{new Date(merchant.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="mt-1.5">
            {loading ? (
              <div className="flex items-center text-[10px] text-gray-400">
                <RefreshCw className="h-2.5 w-2.5 animate-spin mr-1" />
                Validating status...
              </div>
            ) : analysis?.isAnomaly ? (
              <div className="flex items-start gap-1.5">
                <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${analysis.severity === 'high' ? 'text-red-500' : 'text-orange-500'}`} />
                <p className="text-[10px] leading-tight font-medium text-gray-700">
                  <span className="font-bold uppercase mr-1">{analysis.severity}!</span>
                  {analysis.reason}
                </p>
              </div>
            ) : (
              <div className="flex items-center text-[10px] text-green-600 font-semibold">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                Operational
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="px-3.5 pb-4 pt-1 animate-in slide-in-from-top-2 duration-300">
          <div className="flex gap-2.5 mb-4">
            <button 
              onClick={() => setActiveTab(activeTab === 'hours' ? null : 'hours')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all border ${activeTab === 'hours' ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-100' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'}`}
            >
              <Calendar className="h-3.5 w-3.5" /> WORKING HOURS
            </button>
            <button 
              onClick={() => setActiveTab(activeTab === 'pause' ? null : 'pause')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all border ${activeTab === 'pause' ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-100' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'}`}
            >
              <Coffee className="h-3.5 w-3.5" /> SCHEDULE PAUSE
            </button>
          </div>

          {activeTab === 'hours' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xl shadow-black/5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4 text-red-500" />
                   <h4 className="text-[11px] font-black uppercase text-gray-900 tracking-widest">Adjust Schedule</h4>
                </div>
                <div className="flex gap-2">
                   <button disabled={saving} onClick={handleSaveHours} className="bg-green-50 text-green-600 hover:bg-green-100 p-1.5 rounded-lg transition-colors"><Save className="h-4 w-4" /></button>
                   <button onClick={() => setActiveTab(null)} className="bg-gray-50 text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1 thin-scrollbar">
                {tempHours.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] font-bold text-gray-600 w-20">{h.dayOfWeek}</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={h.open} 
                        onChange={(e) => {
                          const newHours = [...tempHours];
                          newHours[idx] = { ...h, open: e.target.value };
                          setTempHours(newHours);
                        }}
                        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-center text-[11px] font-medium focus:ring-1 focus:ring-red-200 outline-none"
                      />
                      <span className="text-gray-300">—</span>
                      <input 
                        type="text" 
                        value={h.close} 
                        onChange={(e) => {
                          const newHours = [...tempHours];
                          newHours[idx] = { ...h, close: e.target.value };
                          setTempHours(newHours);
                        }}
                        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-center text-[11px] font-medium focus:ring-1 focus:ring-red-200 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {saving && <p className="text-[9px] text-center text-red-600 mt-3 font-bold animate-pulse tracking-widest">SYNCING WITH IFOOD...</p>}
            </div>
          )}

          {activeTab === 'pause' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xl shadow-black/5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <Timer className="h-4 w-4 text-red-500" />
                   <h4 className="text-[11px] font-black uppercase text-gray-900 tracking-widest">Pausa Programada</h4>
                </div>
                <button onClick={() => setActiveTab(null)} className="bg-gray-50 text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
              </div>
              
              {/* Presets */}
              <div className="mb-5">
                <p className="text-[9px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Quick Duration</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {[15, 30, 60, 120].map(m => (
                    <button 
                      key={m}
                      onClick={() => setPauseDuration(m)}
                      className={`py-2 rounded-xl text-[11px] font-black border transition-all ${pauseDuration === m ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'}`}
                    >
                      {m >= 60 ? `${m/60}h` : `${m}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Carousels with Manual Toggles */}
              <div className="space-y-2 mb-6">
                <TimeCarousel 
                  label="Start Window" 
                  selectedTime={pauseStartTime} 
                  onSelect={(t) => { setPauseStartTime(t); setPauseDuration(null); }} 
                />
                <TimeCarousel 
                  label="End Window" 
                  selectedTime={pauseEndTime} 
                  onSelect={(t) => { setPauseEndTime(t); setPauseDuration(null); }} 
                />
              </div>

              <button 
                onClick={handleSchedulePause}
                disabled={saving}
                className="w-full bg-red-600 text-white text-[11px] font-black py-3 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-red-200 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    UPDATING MERCHANT...
                  </>
                ) : pauseDuration ? (
                  `ACTIVATE ${pauseDuration}M PAUSE`
                ) : (
                  `CONFIRM CUSTOM PAUSE`
                )}
              </button>
              <p className="text-[9px] text-gray-400 text-center mt-3 font-medium">Auto-resume after duration expires</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
