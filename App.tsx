import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Rider, Race, ClassTier, Discipline, GlobalInsight } from './types';
import { INITIAL_ELO as DEFAULT_INITIAL_ELO, K_FACTOR as DEFAULT_K_FACTOR } from './constants';
import { getRaces, saveRaces, clearAllDB, bulkAddRaces } from './services/dbService';
import { workerBlobCode } from './services/workerCode';

// Components
import { Sidebar } from './components/Sidebar';
import { AnalyticsView } from './components/AnalyticsView';
import { DatabaseView } from './components/DatabaseView';

const workerBlob = new Blob([workerBlobCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'database'>('analytics');
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'rider' | 'meta'>('rider');
  const [riders, setRiders] = useState<Map<string, Rider>>(new Map());
  const [races, setRaces] = useState<Race[]>([]);
  const [globalInsights, setGlobalInsights] = useState<GlobalInsight[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [activeRiderId, setActiveRiderId] = useState<string | null>(null);
  
  const [selDiscipline, setSelDiscipline] = useState<Discipline>('MX');
  const [selTier, setSelTier] = useState<ClassTier | 'GLOBAL'>('GLOBAL');
  
  // Settings
  const [provisionalInit, setProvisionalInit] = useState(false);
  const [mulliganEnabled, setMulliganEnabled] = useState(false);
  const [churnDecayEnabled, setChurnDecayEnabled] = useState(false);
  
  // Advanced Tweakables
  const [standardK, setStandardK] = useState(DEFAULT_K_FACTOR); // Default 32
  const [provisionalK, setProvisionalK] = useState(80);
  const [provisionalRaces, setProvisionalRaces] = useState(15);
  const [initialElo, setInitialElo] = useState(DEFAULT_INITIAL_ELO);
  const [decayOffset, setDecayOffset] = useState(0); // -1.0 to 1.0
  const [mulliganCap, setMulliganCap] = useState(3);

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] System initialized v1.0`,
    `[${new Date().toLocaleTimeString()}] Waiting for data...`
  ]);

  const addLog = (msg: string) => {
    setConsoleLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  };
  
  const workerRef = useRef<Worker | null>(null);
  const calculationVersion = useRef(0);

  // Worker Initialization
  useEffect(() => {
    workerRef.current = new Worker(workerUrl);
    workerRef.current.onmessage = (e) => {
      const { riders: processedRiders, globalInsights: insights, version: messageVersion } = e.data;
      if (messageVersion !== calculationVersion.current) return;
      
      const riderMap = new Map<string, Rider>();
      Object.keys(processedRiders).forEach(id => {
        riderMap.set(id, processedRiders[id]);
      });
      setRiders(riderMap);
      setGlobalInsights(insights);
      setIsCalculating(false);
      addLog(`Calculation complete. Riders: ${riderMap.size}`);
    };
    return () => workerRef.current?.terminate();
  }, []);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const existingRaces = await getRaces();
        setRaces(existingRaces);
        if (existingRaces.length > 0) {
          addLog(`Loaded ${existingRaces.length} races from local storage.`);
        }
      } catch (err) {
        console.error("Initial load error:", err);
        addLog("Error loading local storage.");
      }
    };
    loadData();
  }, []);

  const handleHydrateFromLocalFile = async () => {
    setIsHydrating(true);
    addLog("Initiating local hydration request...");
    try {
      const response = await fetch('./database.json');
      if (response.ok) {
        addLog("Fetching database.json...");
        const externalData = await response.json();
        if (Array.isArray(externalData) && externalData.length > 0) {
          addLog(`Found ${externalData.length} records. Importing...`);
          await bulkAddRaces(externalData);
          const updated = await getRaces();
          setRaces(updated);
          addLog("Hydration successful.");
        }
      } else {
        addLog("Error: database.json not found.");
        alert("database.json not found.");
      }
    } catch (err) {
      console.warn("[BOOT] Error reading database.json", err);
      addLog(`Hydration error: ${err}`);
    }
    setIsHydrating(false);
  };

  // ELO Re-calculation Trigger
  useEffect(() => {
    if (races.length === 0) {
      setRiders(new Map());
      setGlobalInsights([]);
      setIsCalculating(false);
      calculationVersion.current++;
      return;
    }

    setIsCalculating(true);
    addLog("Starting rating calculation...");
    calculationVersion.current++;
    const currentVer = calculationVersion.current;

    const racesToProcess = races.filter(race => {
      if (selTier === 'GLOBAL') return true;
      return race.tier === selTier;
    });

    workerRef.current?.postMessage({ 
      races: racesToProcess, 
      INITIAL_ELO: initialElo, 
      STANDARD_K: standardK,
      PROVISIONAL_K: provisionalK,
      PROVISIONAL_RACES: provisionalRaces,
      version: currentVer,
      provisionalInit,
      mulliganEnabled,
      mulliganCap,
      churnDecayEnabled,
      decayOffset
    });
    
    saveRaces(races);
  }, [races, selTier, provisionalInit, mulliganEnabled, mulliganCap, churnDecayEnabled, standardK, provisionalK, provisionalRaces, initialElo, decayOffset]);

  const filteredRiders = useMemo(() => {
    return Array.from(riders.values()).sort((a: Rider, b: Rider) => b.peakElo - a.peakElo);
  }, [riders]);

  // Keyboard Navigation Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'analytics' || !activeRiderId || filteredRiders.length === 0) return;

      const currentIndex = filteredRiders.findIndex(r => r.id === activeRiderId);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        setActiveRiderId(filteredRiders[prevIndex].id);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(filteredRiders.length - 1, currentIndex + 1);
        setActiveRiderId(filteredRiders[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeRiderId, filteredRiders]);

  const activeRiderRank = useMemo(() => {
    if (!activeRiderId) return null;
    const idx = filteredRiders.findIndex(r => r.id === activeRiderId);
    return idx !== -1 ? idx + 1 : null;
  }, [filteredRiders, activeRiderId]);

  const flatResults = useMemo(() => {
    return races.flatMap(race => 
      race.results.map(res => ({
        year: race.date.split('-')[0],
        tier: race.tier,
        rider: res.riderName,
        track: race.venue,
        date: race.date,
        overall: res.position,
        weblink: race.url
      }))
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [races]);

  const activeRiderData = useMemo(() => {
    const r = activeRiderId ? riders.get(activeRiderId) : null;
    if (!r) return null;
    const uniqueHistory = [];
    const datesSeen = new Set();
    for (let i = r.history.length - 1; i >= 0; i--) {
      if (!datesSeen.has(r.history[i].date)) {
        uniqueHistory.unshift(r.history[i]);
        datesSeen.add(r.history[i].date);
      }
    }
    return { ...r, history: uniqueHistory };
  }, [riders, activeRiderId]);

  const handleCSVImport = async (newRaces: Race[]) => {
    addLog(`Processing import of ${newRaces.length} races...`);
    await bulkAddRaces(newRaces);
    const updated = await getRaces();
    setRaces(updated);
    addLog("Import committed to database.");
  };

  const handleFullWipe = async () => {
    if (window.confirm('Wipe all local data?')) {
      addLog("Wiping local database...");
      setIsWiping(true);
      setIsCalculating(false);
      calculationVersion.current++;
      try {
        await clearAllDB();
        setRaces([]);
        setRiders(new Map());
        setGlobalInsights([]);
        setActiveRiderId(null);
        addLog("Database successfully wiped.");
      } catch (err) {
        console.error(err);
        addLog("Error during wipe operation.");
      } finally {
        setIsWiping(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col lg:flex-row overflow-hidden relative">
      {(isCalculating || isHydrating || isWiping) && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center p-12 bg-slate-900 border border-slate-800 rounded-[40px] shadow-3xl">
            <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-xl font-black uppercase italic tracking-widest text-orange-500">
              {isWiping ? 'Wiping Local Database...' : isHydrating ? 'Hydrating Database...' : 'Processing Power Ratings...'}
            </p>
          </div>
        </div>
      )}

      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab}
        selDiscipline={selDiscipline} setSelDiscipline={setSelDiscipline}
        selTier={selTier} setSelTier={setSelTier}
        provisionalInit={provisionalInit} setProvisionalInit={setProvisionalInit}
        mulliganEnabled={mulliganEnabled} setMulliganEnabled={setMulliganEnabled}
        churnDecayEnabled={churnDecayEnabled} setChurnDecayEnabled={setChurnDecayEnabled}
        filteredRiders={filteredRiders}
        activeRiderId={activeRiderId} setActiveRiderId={setActiveRiderId}
        handleFullWipe={handleFullWipe}
        totalRaces={races.length}
        totalRiders={riders.size}
        logs={consoleLogs}
        standardK={standardK} setStandardK={setStandardK}
        provisionalK={provisionalK} setProvisionalK={setProvisionalK}
        provisionalRaces={provisionalRaces} setProvisionalRaces={setProvisionalRaces}
        initialElo={initialElo} setInitialElo={setInitialElo}
        decayOffset={decayOffset} setDecayOffset={setDecayOffset}
        mulliganCap={mulliganCap} setMulliganCap={setMulliganCap}
        analyticsViewMode={analyticsViewMode}
        setAnalyticsViewMode={setAnalyticsViewMode}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#020617] flex flex-col h-screen">
        {activeTab === 'analytics' && (
          <AnalyticsView 
            activeRiderData={activeRiderData} 
            rank={activeRiderRank} 
            globalInsights={globalInsights}
            selectedTier={selTier}
            allRiders={filteredRiders}
            viewMode={analyticsViewMode}
          />
        )}
        {activeTab === 'database' && (
          <DatabaseView 
            flatResults={flatResults} 
            allRaces={races}
            onImportCSV={handleCSVImport}
            onHydrate={handleHydrateFromLocalFile}
            onLog={addLog}
          />
        )}
      </main>
    </div>
  );
};

export default App;