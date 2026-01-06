
export type ClassTier = 'PREMIER' | 'LITES' | 'OPEN';
export type Discipline = 'MX' | 'SX';

export interface Rider {
  id: string;
  name: string;
  number: string;
  elo: number;
  peakElo: number;
  peakYear?: string;
  history: EloPoint[];
  lastRaceDate: string;
  tier: ClassTier;
  tierCounts?: {
    PREMIER: number;
    LITES: number;
    OPEN: number;
  };
  tierWins?: {
    PREMIER: number;
    LITES: number;
    OPEN: number;
  };
  tierEliteRaces?: {
    PREMIER: number;
    LITES: number;
    OPEN: number;
  };
  // Advanced Metrics
  eliteRaces?: number; // Count of races above elite 10% level
  volatility?: number; // SD of last 10 races
  nemesisMap?: Record<string, number>; // { riderName: netEloTransferred }
}

export interface EloPoint {
  date: string;
  value: number;
  raceName: string;
}

export interface GlobalInsight {
  date: string;
  avgTop10: number;
  dominanceGap: number;
  leader: string;
  runnerUp?: string;
  chasePackAvg: number;
}

export interface RaceResult {
  position: number;
  riderName: string;
  number: string;
  hometown?: string;
  moto1?: string;
  moto2?: string;
  machine?: string;
  points?: number;
}

export interface Race {
  id: string;
  name: string;
  date: string;
  venue: string;
  results: RaceResult[];
  tier: ClassTier;
  discipline: Discipline;
  url: string;
  className: string;
}