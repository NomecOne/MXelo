import React, { useState, useMemo } from 'react';
import { Rider, GlobalInsight, ClassTier } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, BarChart, Bar, Cell } from 'recharts';

interface AnalyticsViewProps {
  activeRiderData: Rider | null;
  rank: number | null;
  globalInsights: GlobalInsight[];
  selectedTier: ClassTier | 'GLOBAL';
  allRiders: Rider[];
  viewMode: 'rider' | 'meta';
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeRiderData, rank, globalInsights, selectedTier, allRiders, viewMode }) => {

  const getRankLabel = (tier: string) => {
    switch (tier) {
      case 'PREMIER': return 'Premiere Elo Rank';
      case 'LITES': return 'Lites Elo Rank';
      case 'OPEN': return 'Open Elo Rank';
      default: return 'Global Elo Rank';
    }
  };

  const getTierStats = (r: Rider, t: ClassTier | 'GLOBAL') => {
     if (t === 'GLOBAL') {
        const wins = (r.tierWins?.PREMIER || 0) + (r.tierWins?.LITES || 0) + (r.tierWins?.OPEN || 0);
        const races = (r.tierCounts?.PREMIER || 0) + (r.tierCounts?.LITES || 0) + (r.tierCounts?.OPEN || 0);
        const elite = (r.tierEliteRaces?.PREMIER || 0) + (r.tierEliteRaces?.LITES || 0) + (r.tierEliteRaces?.OPEN || 0);
        return { wins, races, elite };
     }
     return {
        wins: r.tierWins?.[t] || 0,
        races: r.tierCounts?.[t] || 0,
        elite: r.tierEliteRaces?.[t] || 0
     };
  };

  const stats = useMemo(() => {
    if (!activeRiderData || !allRiders.length) return null;

    const myStats = getTierStats(activeRiderData, selectedTier);
    const winPerc = myStats.races > 0 ? (myStats.wins / myStats.races) * 100 : 0;

    // Calculate Rankings
    const ridersWithStats = allRiders.map(r => {
        const s = getTierStats(r, selectedTier); 
        return { 
           id: r.id, 
           ...s,
           winPerc: s.races > 0 ? (s.wins / s.races) * 100 : 0
        };
    });
    
    // Win Rank
    ridersWithStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
    });
    const winRank = ridersWithStats.findIndex(r => r.id === activeRiderData.id) + 1;

    // Win % Rank
    ridersWithStats.sort((a, b) => {
        if (b.winPerc !== a.winPerc) return b.winPerc - a.winPerc;
        return b.wins - a.wins; // tie breaker
    });
    const winPercRank = ridersWithStats.findIndex(r => r.id === activeRiderData.id) + 1;

    // Elite Longevity Rank
    ridersWithStats.sort((a, b) => b.elite - a.elite);
    const eliteRank = ridersWithStats.findIndex(r => r.id === activeRiderData.id) + 1;

    return {
        wins: myStats.wins,
        winRank,
        winPerc,
        winPercRank,
        elite: myStats.elite,
        eliteRank,
        volatility: activeRiderData.volatility || 0
    };
  }, [activeRiderData, allRiders, selectedTier]);


  if (viewMode === 'meta') {
    return (
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-h-0 flex-1 flex flex-col">
        <div className="flex justify-between items-center shrink-0">
          <h2 className="text-3xl font-black italic uppercase italic tracking-tighter text-white">Strength of Eras</h2>
        </div>

        <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-hide pb-4">
          {/* Era Strength Index */}
          <div className="bg-slate-950 p-6 rounded-[40px] border border-slate-800 shadow-2xl h-[400px] flex flex-col shrink-0">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest shrink-0">Era Strength Index (Avg Top 10 ELO)</h3>
            <div className="flex-1 min-h-0 relative w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={globalInsights}>
                  <defs>
                    <linearGradient id="eraStrength" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey={(d: GlobalInsight) => parseInt(d.date.split('-')[0])} 
                    type="number" 
                    domain={[1972, 2025]}
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis stroke="#475569" fontSize={10} domain={['dataMin - 100', 'dataMax + 100']} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="avgTop10" stroke="#4f46e5" strokeWidth={3} fill="url(#eraStrength)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dominance Gap Chart */}
          <div className="bg-slate-950 p-6 rounded-[40px] border border-slate-800 shadow-2xl h-[400px] flex flex-col shrink-0">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest shrink-0">Dominance Gap (#1 vs #2 Points)</h3>
            <div className="flex-1 min-h-0 relative w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={globalInsights}>
                  <defs>
                    <linearGradient id="dominanceGapGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey={(d: GlobalInsight) => parseInt(d.date.split('-')[0])} 
                    type="number" 
                    domain={[1972, 2025]}
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as GlobalInsight;
                        return (
                          <div className="bg-[#0f172a] border border-slate-800 p-3 rounded-xl shadow-2xl">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                             <div className="mb-3">
                               <p className="text-[9px] font-black text-slate-500 uppercase">Dominance Gap</p>
                               <p className="text-2xl font-black text-orange-500">{data.dominanceGap}</p>
                             </div>
                             <div className="space-y-1.5 border-t border-slate-800/50 pt-2">
                               <div className="flex items-center gap-2">
                                 <span className="text-[9px] font-black text-yellow-500 w-4">#1</span>
                                 <span className="text-[10px] font-bold text-white uppercase tracking-tight">{data.leader}</span>
                               </div>
                               {data.runnerUp && (
                                 <div className="flex items-center gap-2">
                                   <span className="text-[9px] font-black text-slate-500 w-4">#2</span>
                                   <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">{data.runnerUp}</span>
                                 </div>
                               )}
                             </div>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Area type="monotone" dataKey="dominanceGap" stroke="#ea580c" strokeWidth={2} fill="url(#dominanceGapGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!activeRiderData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="opacity-20 italic font-black uppercase tracking-[2em] text-2xl text-center">Select Rider</div>
      </div>
    );
  }

  // Calculate Nemesis Data
  const sortedNemesis = activeRiderData.nemesisMap 
    ? Object.entries(activeRiderData.nemesisMap).sort((a, b) => b[1] - a[1])
    : [];
  const topVictims = sortedNemesis.slice(0, 3);
  const topNemesis = sortedNemesis.slice(-3).reverse();

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col h-full overflow-hidden">
      {/* Header Area - Shrink 0 */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 shrink-0 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black italic uppercase leading-[0.9] tracking-tighter text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {activeRiderData.name}
            </h2>
          </div>
          <div className="mt-1.5 flex gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <span>Last Race <span className="text-white ml-1">{activeRiderData.lastRaceDate}</span></span>
            <span className="hidden sm:inline">|</span>
            <span>Style: <span className={(activeRiderData.volatility || 0) > 15 ? 'text-orange-500' : 'text-emerald-500'}>
              {(activeRiderData.volatility || 0) > 15 ? 'GAMBLER' : 'BANKER'}
            </span></span>
          </div>
        </div>

        <div className="flex gap-3 shrink-0 overflow-x-auto pb-2 scrollbar-hide">
          <div className="bg-slate-950 px-5 py-4 lg:px-7 lg:py-6 rounded-[32px] border border-slate-800 text-center shadow-3xl min-w-[150px] border-indigo-500/20 flex flex-col justify-center">
            <p className="text-[9px] text-slate-500 uppercase font-black mb-0.5">Peak ELO</p>
            <p className="text-3xl lg:text-5xl font-black mono text-indigo-500 italic leading-none">{activeRiderData.peakElo}</p>
          </div>
          <div className="bg-slate-950 px-5 py-4 lg:px-7 lg:py-6 rounded-[32px] border border-slate-800 text-center shadow-3xl min-w-[150px] border-orange-500/20 flex flex-col justify-center">
            <p className="text-[9px] text-slate-500 uppercase font-black mb-0.5">{getRankLabel(selectedTier)}</p>
            <p className="text-3xl lg:text-5xl font-black mono text-orange-500 italic leading-none">#{rank ?? '??'}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-hide space-y-4">
        {/* Main Chart - Full Width */}
        <div className="bg-slate-950 p-6 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col h-[400px] shrink-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Performance Curve</h3>
          </div>
          <div className="flex-1 w-full min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeRiderData.history}>
                  <defs>
                    <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={v => v.split('-')[0]} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} domain={['dataMin - 100', 'dataMax + 100']} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '16px' }}
                    labelClassName="font-black text-[10px] uppercase text-slate-400 mb-2"
                    itemStyle={{ fontSize: '14px', fontWeight: '900', color: '#ea580c' }}
                  />
                  <Area type="monotone" dataKey="value" name="ELO" stroke="#ea580c" strokeWidth={4} fill="url(#colorElo)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stats Grid - Moved Below Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Advanced Stats Card */}
          <div className="lg:col-span-1 bg-slate-950 p-6 rounded-[40px] border border-slate-800 shadow-2xl shrink-0 min-h-[250px] flex flex-col">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Metric Profile ({selectedTier})</h3>
             {stats ? (
               <div className="grid grid-cols-2 gap-x-4 gap-y-6 flex-1">
                 {/* Wins */}
                 <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Wins</p>
                   <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-black text-white">{stats.wins}</span>
                     <span className="text-[10px] mono text-emerald-500 font-bold">#{stats.winRank}</span>
                   </div>
                 </div>
                 
                 {/* Win % */}
                 <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Win %</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{stats.winPerc.toFixed(1)}%</span>
                      <span className="text-[10px] mono text-emerald-500 font-bold">#{stats.winPercRank}</span>
                   </div>
                 </div>

                 {/* Elite Longevity */}
                 <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Elite Races</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{stats.elite}</span>
                      <span className="text-[10px] mono text-emerald-500 font-bold">#{stats.eliteRank}</span>
                   </div>
                 </div>

                 {/* Volatility */}
                 <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Volatility</p>
                   <p className="text-3xl font-black text-orange-500">{stats.volatility.toFixed(1)}</p>
                 </div>
               </div>
             ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-[10px] italic">No Data</div>
             )}
          </div>

          {/* Nemesis Stats */}
          <div className="lg:col-span-2 bg-slate-950 p-6 rounded-[40px] border border-slate-800 shadow-2xl flex flex-col h-[250px]">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 shrink-0">Nemesis Matrix</h3>
            
            <div className="grid grid-cols-2 gap-8 h-full min-h-0">
              <div className="overflow-y-auto pr-1 scrollbar-hide">
                <p className="text-[9px] font-black text-emerald-500 uppercase mb-3 border-b border-slate-900 pb-2">Favorite Targets (Elo Gained)</p>
                {topVictims.length > 0 ? topVictims.map(([name, val], i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-900/50 last:border-0">
                    <span className="text-[11px] font-bold text-white uppercase truncate max-w-[140px]">{name}</span>
                    <span className="text-[11px] mono text-emerald-500 font-black">+{Math.round(val)}</span>
                  </div>
                )) : <p className="text-[10px] text-slate-700 italic">No data yet</p>}
              </div>

              <div className="overflow-y-auto pr-1 scrollbar-hide">
                <p className="text-[9px] font-black text-orange-500 uppercase mb-3 border-b border-slate-900 pb-2">Hardest Rival (Elo Lost)</p>
                {topNemesis.length > 0 ? topNemesis.map(([name, val], i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-900/50 last:border-0">
                    <span className="text-[11px] font-bold text-white uppercase truncate max-w-[140px]">{name}</span>
                    <span className="text-[11px] mono text-orange-500 font-black">{Math.round(val)}</span>
                  </div>
                )) : <p className="text-[10px] text-slate-700 italic">No data yet</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};