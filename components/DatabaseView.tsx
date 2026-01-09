import React, { useState, useRef } from 'react';
import { Race, Rider } from '../types';
import { VirtualTable } from './VirtualTable';
import { parseRacesCSV, exportRacesToJSON, exportRacesToCSV, exportRidersToCSV, downloadBlob } from '../services/dataService';

export interface FlatResult {
  id: string;
  date: string;
  className: string;
  track: string;
  type: string;
  tier: string;
  overall: number;
  rider: string;
  machine: string;
  moto1: string;
  moto2: string;
}

interface DatabaseViewProps {
  flatResults: FlatResult[];
  allRaces: Race[];
  analyzedRiders: Rider[];
  currentSettings: Record<string, any>;
  onImportCSV: (races: Race[]) => void;
  onHydrate: () => void;
  onLog: (msg: string) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ flatResults, allRaces, analyzedRiders, currentSettings, onImportCSV, onHydrate, onLog }) => {
  const [dbSubTab, setDbSubTab] = useState<'results' | 'transfer'>('transfer');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onLog(`Reading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        onLog("Parsing CSV data...");
        const parsed = parseRacesCSV(text);
        if (parsed.length > 0) {
          onLog(`Successfully parsed ${parsed.length} race events.`);
          onImportCSV(parsed);
        } else {
          onLog("Warning: No valid race data found in CSV.");
          alert("No valid race data found in CSV. Check headers.");
        }
      } catch (err) {
        onLog(`Error parsing CSV: ${err}`);
        alert("Error parsing CSV. Ensure headers match expected format.");
      }
    };
    reader.readAsText(file);
    // Clear input so same file can be re-imported if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportJSON = () => {
    const json = exportRacesToJSON(allRaces);
    const filename = `mxelo_export_${new Date().toISOString().split('T')[0]}.json`;
    onLog(`Exporting database snapshot to ${filename}...`);
    downloadBlob(json, filename, 'application/json');
  };

  const handleExportCSV = () => {
    const csv = exportRacesToCSV(allRaces);
    const filename = `mxelo_export_${new Date().toISOString().split('T')[0]}.csv`;
    onLog(`Exporting CSV database snapshot to ${filename}...`);
    downloadBlob(csv, filename, 'text/csv');
  };

  const handleExportMetrics = () => {
    const csv = exportRidersToCSV(analyzedRiders, currentSettings);
    const filename = `mxelo_rider_metrics_${new Date().toISOString().split('T')[0]}.csv`;
    onLog(`Exporting metrics for ${analyzedRiders.length} riders to ${filename}...`);
    downloadBlob(csv, filename, 'text/csv');
  };

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0">
      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 w-fit shrink-0">
        <button onClick={() => setDbSubTab('transfer')} className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${dbSubTab === 'transfer' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Import/Export</button>
        <button onClick={() => setDbSubTab('results')} className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${dbSubTab === 'results' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Raw Data</button>
      </div>

      <div className="flex-1 min-h-0">
        {dbSubTab === 'results' && (
          <VirtualTable<FlatResult> 
            data={flatResults}
            rowHeight={45}
            header={
              <tr className="w-full flex px-4 py-3 text-slate-500 uppercase text-[9px] font-black border-b border-slate-800 gap-2">
                <th className="w-[80px] shrink-0 text-left">Date</th>
                <th className="w-[60px] shrink-0 text-left">Class</th>
                <th className="flex-1 min-w-[100px] text-left truncate">Track</th>
                <th className="w-[40px] shrink-0 text-left">Type</th>
                <th className="w-[60px] shrink-0 text-left">Tier</th>
                <th className="w-[40px] shrink-0 text-center">Pos</th>
                <th className="w-[140px] shrink-0 text-left truncate">Rider</th>
                <th className="w-[100px] shrink-0 text-left truncate">Machine</th>
                <th className="w-[40px] shrink-0 text-center">M1</th>
                <th className="w-[40px] shrink-0 text-center">M2</th>
              </tr>
            }
            renderRow={(res, i) => (
              <tr key={res.id} className="w-full flex px-4 py-0 border-b border-slate-900/30 items-center hover:bg-slate-900/20 transition-colors gap-2 h-full text-[10px]">
                <td className="w-[80px] shrink-0 opacity-70 font-mono">{res.date}</td>
                <td className="w-[60px] shrink-0 truncate font-bold text-slate-400">{res.className}</td>
                <td className="flex-1 min-w-[100px] truncate opacity-70" title={res.track}>{res.track}</td>
                <td className="w-[40px] shrink-0 opacity-50">{res.type}</td>
                <td className="w-[60px] shrink-0 font-bold text-slate-500 truncate">{res.tier}</td>
                <td className="w-[40px] shrink-0 text-center font-black text-orange-500">{res.overall}</td>
                <td className="w-[140px] shrink-0 truncate font-bold text-slate-300" title={res.rider}>{res.rider}</td>
                <td className="w-[100px] shrink-0 truncate opacity-50" title={res.machine}>{res.machine}</td>
                <td className="w-[40px] shrink-0 text-center opacity-50">{res.moto1}</td>
                <td className="w-[40px] shrink-0 text-center opacity-50">{res.moto2}</td>
              </tr>
            )}
          />
        )}

        {dbSubTab === 'transfer' && (
          <div className="bg-slate-950 p-12 rounded-[40px] border border-slate-800 border-dashed flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-300 h-full">
            <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tight text-white mb-2">Import / Export</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">Import CSV files or sync your master database.json file.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] sm:text-[11px] font-black uppercase transition-all shadow-xl shadow-orange-600/10"
              >
                Upload Data CSV
              </button>
              <button 
                onClick={onHydrate}
                className="px-6 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] sm:text-[11px] font-black uppercase transition-all shadow-xl shadow-indigo-600/10"
              >
                Load Sample Data
              </button>
              <button 
                onClick={handleExportCSV}
                className="px-6 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] sm:text-[11px] font-black uppercase transition-all border border-slate-700"
              >
                Export Data CSV
              </button>
              <button 
                onClick={handleExportJSON}
                className="px-6 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] sm:text-[11px] font-black uppercase transition-all border border-slate-700"
              >
                Export Data JSON
              </button>
              <button 
                onClick={handleExportMetrics}
                className="px-6 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] sm:text-[11px] font-black uppercase transition-all shadow-xl shadow-emerald-600/10 sm:col-span-2"
              >
                Export Metrics CSV
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={handleFileChange} 
            />
            
            <div className="pt-8 border-t border-slate-900 w-full max-w-sm">
              <p className="text-[10px] text-slate-600 uppercase font-bold mb-4">Database Inventory</p>
              <div className="flex justify-between text-[11px] mono">
                <span className="text-slate-400">Indexed Events</span>
                <span className="text-white font-black">{allRaces.length}</span>
              </div>
              <div className="flex justify-between text-[11px] mono mt-1">
                <span className="text-slate-400">Total Result Rows</span>
                <span className="text-white font-black">{flatResults.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};