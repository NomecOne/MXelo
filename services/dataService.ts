import { Race, RaceResult, ClassTier, Discipline } from '../types';

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