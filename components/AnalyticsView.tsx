import React, { useMemo, useState } from 'react';
import { Rider, GlobalInsight, ClassTier } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AnalyticsViewProps {
  activeRiderData: Rider | null;
  rank: number | null;
  globalInsights: GlobalInsight[];
  selectedTier: ClassTier | 'GLOBAL';
  allRiders: Rider[];
  viewMode: 'rider' | 'meta' | 'metrics';
}

type SortField = 'name' | 'wins' | 'raceCount' | 'winPerc' | 'elite' | 'volatility' | 'top3' | 'top3Perc' | 'top5' | 'top5Perc' | 'top10' | 'top10Perc';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeRiderData, rank, globalInsights, selectedTier, allRiders, viewMode }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortField; direction: 'asc' | 'desc' }>({ key: 'wins', direction: 'desc' });

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
        const top3 = (r.tierTop3s?.PREMIER || 0) + (r.tierTop3s?.LITES || 0) + (r.tierTop3s?.OPEN || 0);
        const top5 = (r.tierTop5s?.PREMIER || 0) + (r.tierTop5s?.LITES || 0) + (r.tierTop5s?.OPEN || 0);
        const top10 = (r.tierTop10s?.PREMIER || 0) + (r.tierTop10s?.LITES || 0) + (r.tierTop10s?.OPEN || 0);
        return { wins, races, elite, top3, top5, top10 };
     }
     return {
        wins: r.tierWins?.[t] || 0,
        races: r.tierCounts?.[t] || 0,
        elite: r.tierEliteRaces?.[t] || 0,
        top3: r.tierTop3s?.[t] || 0,
        top5: r.tierTop5s?.[t] || 0,
        top10: r.tierTop10s?.[t] || 0,
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
           winPerc: s.races > 0 ? (s.wins / s.races) * 100 : 0,
           volatility: r.volatility || 0
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

    // Volatility Rank (Lowest #1)
    // Filter out 0 volatility (insufficient data) to make ranking meaningful
    const validVolRiders = ridersWithStats.filter(r => r.volatility > 0);
    validVolRiders.sort((a, b) => a.volatility - b.volatility);
    
    let volatilityRank = null;
    const myVol = activeRiderData.volatility || 0;
    if (myVol > 0) {
       const idx = validVolRiders.findIndex(r => r.id === activeRiderData.id);
       if (idx !== -1) volatilityRank = idx + 1;
    }

    return {
        wins: myStats.wins,
        winRank,
        winPerc,
        winPercRank,
        elite: myStats.elite,
        eliteRank,
        volatility: myVol,
        volatilityRank
    };
  }, [activeRiderData, allRiders, selectedTier]);

  const metricsData = useMemo(() => {
      if (viewMode !== 'metrics') return [];
      
      const data = allRiders.map(r => {
          const s = getTierStats(r, selectedTier);
          return {
              id: r.id,
              name: r.name,
              wins: s.wins,
              raceCount: s.races,
              winPerc: s.races > 0 ? (s.wins / s.races) * 100 : 0,
              top3: s.top3,
              top3Perc: s.races > 0 ? (s.top3 / s.races) * 100 : 0,
              top5: s.top5,
              top5Perc: s.races > 0 ? (s.top5 / s.races) * 100 : 0,
              top10: s.top10,
              top10Perc: s.races > 0 ? (s.top10 / s.races) * 100 : 0,
              elite: s.elite,
              volatility: r.volatility || 0
          };
      });

      return data.sort((a, b) => {
          if (sortConfig.key === 'volatility') {
             // For Volatility table view:
             // 1. Must have >= 5 races to be ranked at top.
             // 2. Lowest volatility is #1 (better).
             const validA = a.raceCount >= 5 && a.volatility > 0;
             const validB = b.raceCount >= 5 && b.volatility > 0;

             if (validA && !validB) return -1; // Valid records come first
             if (!validA && validB) return 1;
             if (!validA && !validB) return 0; // Both invalid, treat equal

             // Both valid, standard numeric sort
             // ASC = Smallest (Best) first
             if (a.volatility < b.volatility) return sortConfig.direction === 'asc' ? -1 : 1;
             if (a.volatility > b.volatility) return sortConfig.direction === 'asc' ? 1 : -1;
             return 0;
          }

          const valA = a[sortConfig.key];
          const valB = b[sortConfig.key];
          
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [allRiders, selectedTier, sortConfig, viewMode]);

  const handleSort = (key: SortField) => {
      let nextDirection: 'asc' | 'desc' = 'desc';
      
      // Default to ASC for Volatility (Lower is better) and Name
      if (key === 'volatility' || key === 'name') nextDirection = 'asc';

      // If clicking same header, toggle
      if (sortConfig.key === key) {
          nextDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
      }

      setSortConfig({ key, direction: nextDirection });
  };

  if (viewMode === 'metrics') {
      return (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
            <div className="flex justify-between items-center shrink-0 mb-6">
              <h2 className="text-3xl font-black italic uppercase italic tracking-tighter text-white">Metrics Database ({selectedTier})</h2>
            </div>
            
            <div className="flex-1 min-h-0 bg-slate-950 rounded-[40px] border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                <div className="overflow-auto pr-2">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead className="bg-slate-900 sticky top-0 z-10 shadow-lg">
                            <tr>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 w-12 text-center sticky left-0 bg-slate-900 z-20">#</th>
                                <th onClick={() => handleSort('name')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors sticky left-12 bg-slate-900 z-20">
                                    Rider {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('raceCount')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Races {sortConfig.key === 'raceCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('wins')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Wins {sortConfig.key === 'wins' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('winPerc')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Win % {sortConfig.key === 'winPerc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('top3')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Top 3 {sortConfig.key === 'top3' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('top3Perc')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Top 3 % {sortConfig.key === 'top3Perc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('top5')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Top 5 {sortConfig.key === 'top5' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('top5Perc')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Top 5 % {sortConfig.key === 'top5Perc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('top10')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Top 10 {sortConfig.key === 'top10' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('top10Perc')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Top 10 % {sortConfig.key === 'top10Perc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('elite')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Elite Elo Races {sortConfig.key === 'elite' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('volatility')} className="p-4 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap">
                                    Volatility* {sortConfig.key === 'volatility' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/50">
                            {metricsData.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-slate-900/30 transition-colors group">
                                    <td className="p-4 text-[11px] font-mono text-slate-600 font-bold text-center group-hover:text-slate-400 sticky left-0 bg-slate-950 group-hover:bg-slate-900/30 transition-colors z-10">{idx + 1}</td>
                                    <td className="p-4 text-[11px] font-bold text-white uppercase sticky left-12 bg-slate-950 group-hover:bg-slate-900/30 transition-colors z-10">{row.name}</td>
                                    <td className="p-4 text-[11px] font-mono text-slate-400 text-right">{row.raceCount}</td>
                                    <td className="p-4 text-[11px] font-mono text-emerald-500 text-right">{row.wins}</td>
                                    <td className="p-4 text-[11px] font-mono text-slate-300 text-right">{row.winPerc.toFixed(1)}%</td>
                                    <td className="p-4 text-[11px] font-mono text-white text-right">{row.top3}</td>
                                    <td className="p-4 text-[11px] font-mono text-slate-400 text-right">{row.top3Perc.toFixed(1)}%</td>
                                    <td className="p-4 text-[11px] font-mono text-white text-right">{row.top5}</td>
                                    <td className="p-4 text-[11px] font-mono text-slate-400 text-right">{row.top5Perc.toFixed(1)}%</td>
                                    <td className="p-4 text-[11px] font-mono text-white text-right">{row.top10}</td>
                                    <td className="p-4 text-[11px] font-mono text-slate-400 text-right">{row.top10Perc.toFixed(1)}%</td>
                                    <td className="p-4 text-[11px] font-mono text-indigo-400 text-right">{row.elite}</td>
                                    <td className={`p-4 text-[11px] font-mono text-right ${row.raceCount < 5 ? 'text-slate-700' : 'text-orange-500'}`}>
                                        {row.volatility.toFixed(1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
      );
  }

  if (viewMode === 'meta') {
    return (
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
        <div className="flex justify-between items-center shrink-0">
          <h2 className="text-3xl font-black italic uppercase italic tracking-tighter text-white">Strength of Eras</h2>
        </div>

        <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-visible lg:overflow-y-auto pr-2 scrollbar-hide pb-4">
          {/* Era Strength Index */}
          <div className="bg-slate-950 p-6 rounded-[40px] border border-slate-800 shadow-2xl h-[250px] lg:h-[400px] flex flex-col shrink-0">
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
          <div className="bg-slate-950 p-6 rounded-[40px] border border-slate-800 shadow-2xl h-[250px] lg:h-[400px] flex flex-col shrink-0">
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
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
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
      <div className="flex-1 min-h-0 overflow-visible lg:overflow-y-auto pr-1 pb-4 scrollbar-hide space-y-4">
        {/* Main Chart - Full Width */}
        <div className="bg-slate-950 p-4 lg:p-6 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col h-[250px] lg:h-[400px] shrink-0">
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
          <div className="lg:col-span-1 bg-slate-950 p-4 lg:p-6 rounded-[40px] border border-slate-800 shadow-2xl shrink-0 min-h-[250px] flex flex-col">
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
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Elite Elo Races</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{stats.elite}</span>
                      <span className="text-[10px] mono text-emerald-500 font-bold">#{stats.eliteRank}</span>
                   </div>
                 </div>

                 {/* Volatility */}
                 <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Volatility</p>
                   <div className="flex items-baseline gap-2">
                     <p className="text-3xl font-black text-orange-500">{stats.volatility.toFixed(1)}</p>
                     {stats.volatilityRank && (
                       <span className="text-[10px] mono text-emerald-500 font-bold">#{stats.volatilityRank}</span>
                     )}
                   </div>
                 </div>
               </div>
             ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-[10px] italic">No Data</div>
             )}
          </div>

          {/* Nemesis Stats */}
          <div className="lg:col-span-2 bg-slate-950 p-4 lg:p-6 rounded-[40px] border border-slate-800 shadow-2xl flex flex-col h-[250px]">
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