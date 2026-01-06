import React, { useState, useEffect, useMemo } from 'react';
import { Rider, Discipline, ClassTier } from '../types';
import { DISCIPLINES } from '../constants';
import { VirtualTable } from './VirtualTable';

interface SidebarProps {
  activeTab: 'analytics' | 'database';
  setActiveTab: (tab: 'analytics' | 'database') => void;
  selDiscipline: Discipline;
  setSelDiscipline: (d: Discipline) => void;
  selTier: ClassTier | 'GLOBAL';
  setSelTier: (t: ClassTier | 'GLOBAL') => void;
  provisionalInit: boolean;
  setProvisionalInit: (p: boolean) => void;
  mulliganEnabled: boolean;
  setMulliganEnabled: (m: boolean) => void;
  churnDecayEnabled: boolean;
  setChurnDecayEnabled: (c: boolean) => void;
  filteredRiders: Rider[];
  activeRiderId: string | null;
  setActiveRiderId: (id: string | null) => void;
  handleFullWipe: () => void;
  totalRaces: number;
  totalRiders: number;
  logs: string[];
  // Tweakables
  standardK: number;
  setStandardK: (v: number) => void;
  provisionalK: number;
  setProvisionalK: (v: number) => void;
  provisionalRaces: number;
  setProvisionalRaces: (v: number) => void;
  initialElo: number;
  setInitialElo: (v: number) => void;
  decayOffset: number;
  setDecayOffset: (v: number) => void;
  mulliganCap: number;
  setMulliganCap: (v: number) => void;
  analyticsViewMode?: 'rider' | 'meta';
  setAnalyticsViewMode?: (mode: 'rider' | 'meta') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab,
  selDiscipline, setSelDiscipline,
  selTier, setSelTier,
  provisionalInit, setProvisionalInit,
  mulliganEnabled, setMulliganEnabled,
  churnDecayEnabled, setChurnDecayEnabled,
  filteredRiders,
  activeRiderId, setActiveRiderId,
  handleFullWipe,
  totalRaces,
  totalRiders,
  logs,
  standardK, setStandardK,
  provisionalK, setProvisionalK,
  provisionalRaces, setProvisionalRaces,
  initialElo, setInitialElo,
  decayOffset, setDecayOffset,
  mulliganCap, setMulliganCap,
  analyticsViewMode = 'rider',
  setAnalyticsViewMode = () => {}
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for buffering changes
  const [localStandardK, setLocalStandardK] = useState(standardK);
  const [localProvisionalK, setLocalProvisionalK] = useState(provisionalK);
  const [localProvisionalRaces, setLocalProvisionalRaces] = useState(provisionalRaces);
  const [localInitialElo, setLocalInitialElo] = useState(initialElo);
  const [localDecayOffset, setLocalDecayOffset] = useState(decayOffset);
  const [localMulliganCap, setLocalMulliganCap] = useState(mulliganCap);

  // Sync local state when opening or when props change externally (though unlikely while open)
  useEffect(() => {
    if (!showSettings) {
      setLocalStandardK(standardK);
      setLocalProvisionalK(provisionalK);
      setLocalProvisionalRaces(provisionalRaces);
      setLocalInitialElo(initialElo);
      setLocalDecayOffset(decayOffset);
      setLocalMulliganCap(mulliganCap);
    }
  }, [showSettings, standardK, provisionalK, provisionalRaces, initialElo, decayOffset, mulliganCap]);

  const handleToggleSettings = () => {
    if (showSettings) {
      // Closing: Apply changes
      setStandardK(localStandardK);
      setProvisionalK(localProvisionalK);
      setProvisionalRaces(localProvisionalRaces);
      setInitialElo(localInitialElo);
      setDecayOffset(localDecayOffset);
      setMulliganCap(localMulliganCap);
    }
    setShowSettings(!showSettings);
  };

  const displayRiders = useMemo(() => {
    if (!searchQuery) return filteredRiders;
    const lowerQ = searchQuery.toLowerCase();
    return filteredRiders.filter(r => r.name.toLowerCase().includes(lowerQ));
  }, [filteredRiders, searchQuery]);

  return (
    <aside className="w-full lg:w-[380px] bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 shadow-2xl z-20 overflow-hidden h-screen relative">
      <header className="px-5 pt-5 pb-3 border-b border-slate-800 bg-slate-900/40 shrink-0">
        <div className="flex items-center justify-between mb-3 relative">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-10 flex items-center justify-center shrink-0 -rotate-3 hover:rotate-0 transition-transform duration-300">
              <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full text-orange-600 drop-shadow-[0_0_8px_rgba(234,88,12,0.3)]"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="6"
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                <path d="M 20 10 L 80 10 L 95 30 L 88 60 L 78 95 L 60 80 Q 50 75 40 80 L 22 95 L 12 60 L 5 30 Z" />
              </svg>
              <span className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 pt-1 font-black text-[10px] italic tracking-tight text-white select-none">ELO</span>
            </div>
            <h1 className="text-base font-black uppercase italic tracking-tight text-white">MXELO</h1>
          </div>

          {/* Settings Toggle Button */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
             <button 
               onClick={handleToggleSettings}
               className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showSettings ? 'bg-orange-600 text-white shadow-[0_0_12px_rgba(234,88,12,0.5)]' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-white'}`}
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
             </button>
          </div>
          
          <div className="flex flex-col items-end gap-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-600 uppercase">Races</span>
              <span className="text-[12px] font-black text-orange-500 italic leading-none">{totalRaces}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-600 uppercase">Riders</span>
              <span className="text-[12px] font-black text-green-500 italic leading-none">{totalRiders}</span>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mb-2">
          {['analytics', 'database'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`flex-1 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {DISCIPLINES.map(d => (
            <button 
              key={d.id} 
              onClick={() => d.id !== 'SX' && setSelDiscipline(d.id)} 
              disabled={d.id === 'SX'}
              className={`py-1.5 rounded-lg text-[9px] font-black uppercase border border-slate-800 transition-colors 
                ${selDiscipline === d.id 
                  ? 'bg-orange-600 text-white border-orange-500' 
                  : 'text-slate-500 bg-slate-900/50'
                }
                ${d.id === 'SX' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-900'}
              `}
              title={d.id === 'SX' ? "Supercross Coming Soon" : ""}
            >
              {d.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {['GLOBAL', 'PREMIER', 'LITES', 'OPEN'].map(t => (
            <button 
              key={t} 
              onClick={() => setSelTier(t as any)} 
              className={`py-1 rounded-lg text-[7px] font-black uppercase border border-slate-800 transition-colors ${selTier === t ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-500 bg-slate-900/50 hover:bg-slate-900'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {/* Provisional Toggle */}
          <div className="flex flex-col items-center justify-between p-2 bg-slate-900/60 rounded-xl border border-slate-800/50 gap-2">
            <span className={`text-[7px] font-black uppercase tracking-tight text-center transition-colors ${provisionalInit ? 'text-orange-500' : 'text-slate-400'}`}>Provisional</span>
            <button 
              onClick={() => setProvisionalInit(!provisionalInit)}
              className={`w-9 h-4.5 rounded-full relative transition-all duration-300 ${provisionalInit ? 'bg-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.5)]' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 shadow-sm ${provisionalInit ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Mulligan Toggle */}
          <div className="flex flex-col items-center justify-between p-2 bg-slate-900/60 rounded-xl border border-slate-800/50 gap-2">
            <span className={`text-[7px] font-black uppercase tracking-tight text-center transition-colors ${mulliganEnabled ? 'text-orange-500' : 'text-slate-400'}`}>Mulligan</span>
            <button 
              onClick={() => setMulliganEnabled(!mulliganEnabled)}
              className={`w-9 h-4.5 rounded-full relative transition-all duration-300 ${mulliganEnabled ? 'bg-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.5)]' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 shadow-sm ${mulliganEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Churn Decay Toggle */}
          <div className="flex flex-col items-center justify-between p-2 bg-slate-900/60 rounded-xl border border-slate-800/50 gap-2">
            <span className={`text-[7px] font-black uppercase tracking-tight text-center transition-colors ${churnDecayEnabled ? 'text-orange-500' : 'text-slate-400'}`}>Decay</span>
            <button 
              onClick={() => setChurnDecayEnabled(!churnDecayEnabled)}
              className={`w-9 h-4.5 rounded-full relative transition-all duration-300 ${churnDecayEnabled ? 'bg-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.5)]' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 shadow-sm ${churnDecayEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative group">
            <input 
                type="text" 
                placeholder="SEARCH RIDERS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-[9px] font-black uppercase text-white placeholder-slate-600 focus:outline-none focus:border-orange-600 transition-colors focus:bg-slate-950"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </header>

      {/* Settings Overlay Popup */}
      {showSettings && (
        <div className="absolute top-[80px] left-2 right-2 z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-top-4 duration-200 overflow-y-auto max-h-[80vh]">
           <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
             <h3 className="text-[10px] font-black uppercase text-white tracking-widest">Algorithm Tuning</h3>
             <button onClick={handleToggleSettings} className="text-slate-500 hover:text-white">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
           </div>
           
           <div className="space-y-4">
             {/* Standard K Factor (Vet) */}
             <div>
               <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                 <span className="text-slate-400">Standard K (Vet)</span>
                 <span className="text-orange-500">{localStandardK}</span>
               </div>
               <input 
                 type="range" min="10" max="100" step="1" 
                 value={localStandardK} 
                 onChange={(e) => setLocalStandardK(parseInt(e.target.value))}
                 className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
               />
             </div>

             {/* Provisional K Factor (Rookie) */}
             <div>
               <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                 <span className="text-slate-400">Rookie K</span>
                 <span className="text-pink-500">{localProvisionalK}</span>
               </div>
               <input 
                 type="range" min="32" max="150" step="1" 
                 value={localProvisionalK} 
                 onChange={(e) => setLocalProvisionalK(parseInt(e.target.value))}
                 className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
               />
             </div>

             {/* Provisional Race Count */}
             <div>
               <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                 <span className="text-slate-400">Rookie Duration</span>
                 <span className="text-pink-300">{localProvisionalRaces}</span>
               </div>
               <input 
                 type="range" min="0" max="50" step="1" 
                 value={localProvisionalRaces} 
                 onChange={(e) => setLocalProvisionalRaces(parseInt(e.target.value))}
                 className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-300 hover:accent-pink-200"
               />
             </div>

             {/* Initial ELO */}
             <div>
               <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                 <span className="text-slate-400">Initial ELO</span>
                 <span className="text-indigo-400">{localInitialElo}</span>
               </div>
               <input 
                 type="range" min="1000" max="2000" step="50" 
                 value={localInitialElo} 
                 onChange={(e) => setLocalInitialElo(parseInt(e.target.value))}
                 className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
               />
             </div>

             {/* Decay Modifier */}
             <div>
               <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                 <span className="text-slate-400">Decay Mod</span>
                 <span className={localDecayOffset > 0 ? 'text-green-500' : localDecayOffset < 0 ? 'text-red-500' : 'text-slate-200'}>
                    {localDecayOffset > 0 ? '+' : ''}{Math.round(localDecayOffset * 100)}%
                 </span>
               </div>
               <div className="relative">
                 <input 
                   type="range" min="-100" max="100" step="5" 
                   value={Math.round(localDecayOffset * 100)} 
                   onChange={(e) => setLocalDecayOffset(parseInt(e.target.value) / 100)}
                   className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 z-10 relative"
                 />
                 <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600 z-0"></div>
               </div>
               <p className="text-[7px] text-slate-500 mt-1 italic">Adjusts retention rate. + values reduce churn impact.</p>
             </div>

             {/* Mulligan Cap */}
             <div>
               <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                 <span className="text-slate-400">Mulligan Cap</span>
                 <span className="text-white">{localMulliganCap}</span>
               </div>
               <input 
                 type="range" min="1" max="25" step="1" 
                 value={localMulliganCap} 
                 onChange={(e) => setLocalMulliganCap(parseInt(e.target.value))}
                 className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-slate-200"
               />
             </div>
           </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 p-3 bg-[#020617] overflow-hidden">
        {activeTab === 'analytics' ? (
          <VirtualTable<Rider> 
            data={displayRiders}
            rowHeight={75}
            activeId={activeRiderId}
            getId={(r) => r.id}
            header={
              <div className="p-3 grid grid-cols-[1fr_40px_45px] text-[9px] text-slate-500 font-black uppercase items-center">
                <div className="flex items-center gap-3">
                  <span>Rank & Rider</span>
                  <button 
                    onClick={() => setAnalyticsViewMode(analyticsViewMode === 'rider' ? 'meta' : 'rider')}
                    className={`px-1.5 py-0.5 rounded text-[8px] transition-colors border ${analyticsViewMode === 'meta' ? 'bg-orange-600 text-white border-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.4)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}
                  >
                    {analyticsViewMode === 'rider' ? 'ERA STATS' : 'RETURN TO RIDER'}
                  </button>
                </div>
                <span className="text-center w-full">Year</span>
                <span className="text-right">Peak</span>
              </div>
            }
            renderRow={(rider, idx) => (
              <tr key={rider.id} className={`cursor-pointer transition-all border-b border-slate-900/50 ${activeRiderId === rider.id ? 'bg-orange-600 text-white' : 'hover:bg-slate-800/30'}`} onClick={() => setActiveRiderId(rider.id)}>
                <td className="p-3 flex flex-col gap-0.5 overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <span className={`mono font-black italic text-[11px] min-w-[20px] ${activeRiderId === rider.id ? 'text-white' : 'text-orange-500/50'}`}>{filteredRiders.findIndex(r => r.id === rider.id) + 1}</span>
                    <div className="font-black text-[11px] uppercase truncate">{rider.name}</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1 pl-[25px] mt-0.5">
                    <div className="min-w-0">
                      {rider.tierCounts?.PREMIER ? (
                        <span className={`text-[7px] font-black uppercase flex items-center gap-0.5 truncate ${activeRiderId === rider.id ? 'text-white' : 'text-orange-500'}`}>
                          <span className="opacity-70">[{rider.tierCounts.PREMIER}]</span> Pr
                        </span>
                      ) : (
                        <span className="text-[7px] font-black uppercase text-slate-800 select-none">[-] Pr</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      {rider.tierCounts?.LITES ? (
                        <span className={`text-[7px] font-black uppercase flex items-center gap-0.5 truncate ${activeRiderId === rider.id ? 'text-white' : 'text-indigo-400'}`}>
                          <span className="opacity-70">[{rider.tierCounts.LITES}]</span> Lt
                        </span>
                      ) : (
                        <span className="text-[7px] font-black uppercase text-slate-800 select-none">[-] Lt</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      {rider.tierCounts?.OPEN ? (
                        <span className={`text-[7px] font-black uppercase flex items-center gap-0.5 truncate ${activeRiderId === rider.id ? 'text-white' : 'text-emerald-400'}`}>
                          <span className="opacity-70">[{rider.tierCounts.OPEN}]</span> Op
                        </span>
                      ) : (
                        <span className="text-[7px] font-black uppercase text-slate-800 select-none">[-] Op</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center text-[10px] mono font-black align-top pt-[14px]">
                  <div className={activeRiderId === rider.id ? 'text-white' : 'text-slate-600'}>{rider.peakYear || '----'}</div>
                </td>
                <td className="p-3 font-black mono text-right text-[11px] align-top pt-[14px]">
                   <div className={activeRiderId === rider.id ? 'text-white' : 'text-slate-300'}>{rider.peakElo}</div>
                </td>
              </tr>
            )}
          />
        ) : (
          <div className="flex flex-col h-full min-h-0 gap-3">
             <button onClick={handleFullWipe} className="w-full shrink-0 py-2.5 bg-red-950/20 text-red-500 border border-red-900/30 rounded-xl text-[8px] font-black uppercase hover:bg-red-950/40 transition-colors">Wipe Records</button>
             <div className="flex-1 bg-black rounded-xl p-3 border border-slate-800 overflow-y-auto font-mono text-[10px] text-green-500 shadow-inner">
               <div className="flex flex-col-reverse min-h-full justify-end">
                 {logs.map((log, i) => (
                   <div key={i} className="mb-1 break-words opacity-80 hover:opacity-100 border-l-2 border-transparent hover:border-green-800 pl-1 transition-colors">{log}</div>
                 ))}
                 <div className="mb-2 text-slate-500 select-none">_system_terminal_ready...</div>
               </div>
             </div>
          </div>
        )}
      </div>
    </aside>
  );
};