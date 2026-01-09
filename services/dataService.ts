import { Race, RaceResult, ClassTier, Discipline, Rider } from '../types';

/**
 * Robust CSV line parser that handles quoted fields and multiple delimiters.
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let currentField = "";
  let inQuotes = false;
  
  // Detect delimiter (prefer tab if present, otherwise comma)
  const delimiter = line.includes('\t') ? '\t' : ',';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(currentField.trim().replace(/^"|"$/g, ''));
      currentField = "";
    } else {
      currentField += char;
    }
  }
  result.push(currentField.trim().replace(/^"|"$/g, ''));
  return result;
};

/**
 * Parses the specific Racer X CSV format into structured Race objects.
 */
export const parseRacesCSV = (csvText: string): Race[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse headers and normalize them
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const racesMap = new Map<string, Race>();

  const getIdx = (name: string) => headers.indexOf(name.toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const riderIdx = getIdx('rider');
    const dateIdx = getIdx('date');
    const classIdx = getIdx('class');
    const typeIdx = getIdx('type'); // New 'type' column
    const trackIdx = getIdx('track');
    const tierIdx = getIdx('tier');
    const overallIdx = getIdx('overall');
    const machineIdx = getIdx('machine');

    const riderName = riderIdx !== -1 ? cols[riderIdx] : "Unknown Rider";
    const date = dateIdx !== -1 ? cols[dateIdx] : "2000-01-01";
    const className = classIdx !== -1 ? cols[classIdx] : "Unknown Class";
    const typeRaw = typeIdx !== -1 ? cols[typeIdx] : "mx";
    const venue = trackIdx !== -1 ? cols[trackIdx] : "Unknown Track";
    const tierRaw = tierIdx !== -1 ? cols[tierIdx] : "";
    const posStr = overallIdx !== -1 ? cols[overallIdx] : "0";
    const pos = parseInt(posStr) || 0;
    const machine = machineIdx !== -1 ? cols[machineIdx] : "";
    
    // Map CSV tiers to internal types strictly based on the new "tier" column labels
    // Expected: "1 Lites" -> LITES, "2 Premiere" -> PREMIER, "3 Open" -> OPEN
    let tier: ClassTier = 'PREMIER';
    const tLower = tierRaw.toLowerCase();
    
    if (tLower.includes('1') || tLower.includes('lites')) {
      tier = 'LITES';
    } else if (tLower.includes('3') || tLower.includes('open')) {
      tier = 'OPEN';
    } else if (tLower.includes('2') || tLower.includes('premiere') || tLower.includes('premier')) {
      tier = 'PREMIER';
    }
    
    // Determine Discipline (MX vs SX)
    let discipline: Discipline = 'MX';
    if (typeRaw.toLowerCase() === 'sx') {
      discipline = 'SX';
    }

    // Unique key for grouping results into a single race event
    const raceKey = `${date}-${className}-${venue}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    if (!racesMap.has(raceKey)) {
      racesMap.set(raceKey, {
        id: `csv-${raceKey}`,
        name: `${venue} ${className}`,
        date,
        venue,
        tier,
        discipline, 
        url: 'imported-csv',
        className: className.toUpperCase(),
        results: []
      });
    }

    const result: RaceResult = {
      position: pos,
      riderName: riderName.trim(),
      moto1: getIdx('moto 1') !== -1 ? cols[getIdx('moto 1')] : "",
      moto2: getIdx('moto 2') !== -1 ? cols[getIdx('moto 2')] : "",
      machine: machine
    };

    if (result.riderName) {
      racesMap.get(raceKey)!.results.push(result);
    }
  }

  return Array.from(racesMap.values())
    .filter(r => r.results.length > 0)
    .map(r => ({
      ...r,
      results: r.results.sort((a, b) => a.position - b.position)
    }));
};

/**
 * Exports current data to a minified JSON string for project asset use.
 */
export const exportRacesToJSON = (races: Race[]): string => {
  return JSON.stringify(races);
};

/**
 * Exports current data to a CSV string compatible with the import format.
 */
export const exportRacesToCSV = (races: Race[]): string => {
  const headers = ['Date', 'Class', 'Track', 'Type', 'Tier', 'Overall', 'Rider', 'Machine', 'Moto 1', 'Moto 2'];
  const lines = [headers.join(',')];

  const esc = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

  for (const race of races) {
    for (const res of race.results) {
      lines.push([
        esc(race.date),
        esc(race.className),
        esc(race.venue),
        esc(race.discipline),
        esc(race.tier),
        res.position,
        esc(res.riderName),
        esc(res.machine || ''),
        esc(res.moto1 || ''),
        esc(res.moto2 || '')
      ].join(','));
    }
  }
  return lines.join('\n');
};

/**
 * Exports analyzed rider metrics to a CSV with settings configuration.
 */
export const exportRidersToCSV = (riders: Rider[], settings: Record<string, any>): string => {
  const lines: string[] = [];
  
  // 1. Settings Header
  lines.push("--- EXPORT CONFIGURATION ---");
  lines.push(`Export Date,${new Date().toISOString()}`);
  Object.entries(settings).forEach(([k, v]) => lines.push(`${k},${v}`));
  lines.push(""); // Spacer

  // 2. Data Header
  const cols = [
    "Rank", "Name", "Current ELO", "Peak ELO", "Peak Year", "Last Race",
    "Total Races", "Win %", "Wins", "Top 3", "Top 5", "Top 10", "Elite Races", "Volatility",
    "Premier Races", "Premier Wins", "Premier Top 3", "Premier Elite",
    "Lites Races", "Lites Wins", "Lites Top 3", "Lites Elite",
    "Open Races", "Open Wins", "Open Top 3", "Open Elite"
  ];
  lines.push(cols.join(","));

  // Sort by Current ELO Descending for the rank
  const sortedRiders = [...riders].sort((a, b) => b.elo - a.elo);

  // 3. Data Rows
  sortedRiders.forEach((r, i) => {
    const totalRaces = (r.tierCounts?.PREMIER || 0) + (r.tierCounts?.LITES || 0) + (r.tierCounts?.OPEN || 0);
    const totalWins = (r.tierWins?.PREMIER || 0) + (r.tierWins?.LITES || 0) + (r.tierWins?.OPEN || 0);
    const winPerc = totalRaces > 0 ? (totalWins / totalRaces * 100).toFixed(1) : "0.0";
    
    const totalTop3 = (r.tierTop3s?.PREMIER || 0) + (r.tierTop3s?.LITES || 0) + (r.tierTop3s?.OPEN || 0);
    const totalTop5 = (r.tierTop5s?.PREMIER || 0) + (r.tierTop5s?.LITES || 0) + (r.tierTop5s?.OPEN || 0);
    const totalTop10 = (r.tierTop10s?.PREMIER || 0) + (r.tierTop10s?.LITES || 0) + (r.tierTop10s?.OPEN || 0);

    const row = [
      i + 1,
      `"${r.name}"`,
      r.elo,
      r.peakElo,
      r.peakYear || "",
      r.lastRaceDate,
      totalRaces,
      `${winPerc}%`,
      totalWins,
      totalTop3,
      totalTop5,
      totalTop10,
      r.eliteRaces || 0,
      (r.volatility || 0).toFixed(2),
      // Premier
      r.tierCounts?.PREMIER || 0,
      r.tierWins?.PREMIER || 0,
      r.tierTop3s?.PREMIER || 0,
      r.tierEliteRaces?.PREMIER || 0,
      // Lites
      r.tierCounts?.LITES || 0,
      r.tierWins?.LITES || 0,
      r.tierTop3s?.LITES || 0,
      r.tierEliteRaces?.LITES || 0,
      // Open
      r.tierCounts?.OPEN || 0,
      r.tierWins?.OPEN || 0,
      r.tierTop3s?.OPEN || 0,
      r.tierEliteRaces?.OPEN || 0,
    ];
    lines.push(row.join(","));
  });

  return lines.join("\n");
};

/**
 * Triggers a browser download of the data.
 */
export const downloadBlob = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};