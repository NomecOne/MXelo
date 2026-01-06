
import { Race, Rider, ClassTier } from '../types';
import { INITIAL_ELO, K_FACTOR } from '../constants';

export const generateRiderId = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Compresses scores back toward the mean to combat inflation from "Privateer Churn".
 * Now uses a dynamic retention rate based on actual historical rider turnover,
 * and decays towards the actual pool mean rather than a static starting value.
 */
export const applySeasonDecay = (currentRiders: Map<string, Rider>, customRate?: number): Map<string, Rider> => {
  const decayedRiders = new Map<string, Rider>();
  
  // Calculate Actual Mean ELO of the current pool
  let totalElo = 0;
  let riderCount = 0;
  currentRiders.forEach(r => {
    totalElo += r.elo;
    riderCount++;
  });
  
  const MEAN_ELO = riderCount > 0 ? (totalElo / riderCount) : INITIAL_ELO;
  const RETENTION_RATE = customRate !== undefined ? Math.max(0.5, Math.min(0.95, customRate)) : 0.85;

  currentRiders.forEach((rider, key) => {
    const distance = rider.elo - MEAN_ELO;
    const decayedElo = Math.round(MEAN_ELO + (distance * RETENTION_RATE));
    decayedRiders.set(key, {
      ...rider,
      elo: decayedElo
    });
  });

  return decayedRiders;
};

export const processRace = (race: Race, currentRiders: Map<string, Rider>, provisionalInit: boolean = true): Map<string, Rider> => {
  const updatedRiders = new Map(currentRiders);
  const results = [...race.results].sort((a, b) => a.position - b.position);
  const raceYear = race.date.split('-')[0];

  // Calculate averages for dynamic provisional initialization
  let avg1to5 = INITIAL_ELO; 
  let avg7to12 = INITIAL_ELO; 
  
  const establishedRiders = results.filter(res => updatedRiders.has(generateRiderId(res.riderName)));
  
  const set1to5 = establishedRiders.filter(r => r.position >= 1 && r.position <= 5);
  if (set1to5.length > 0) {
    avg1to5 = Math.round(set1to5.reduce((sum, r) => sum + updatedRiders.get(generateRiderId(r.riderName))!.elo, 0) / set1to5.length);
  }
  
  const set7to12 = establishedRiders.filter(r => r.position >= 7 && r.position <= 12);
  if (set7to12.length > 0) {
    avg7to12 = Math.round(set7to12.reduce((sum, r) => sum + updatedRiders.get(generateRiderId(r.riderName))!.elo, 0) / set7to12.length);
  }

  results.forEach(res => {
    const riderId = generateRiderId(res.riderName);
    if (!updatedRiders.has(riderId)) {
      let startingElo = INITIAL_ELO; 

      if (provisionalInit) {
        if (res.position <= 2) {
          startingElo = avg1to5; 
        } else if (res.position <= 10) {
          startingElo = avg7to12;
        } else {
          startingElo = INITIAL_ELO;
        }
      }

      updatedRiders.set(riderId, {
        id: riderId,
        name: res.riderName.trim(),
        number: res.number,
        elo: startingElo,
        peakElo: startingElo,
        peakYear: raceYear,
        history: [{ date: race.date, value: startingElo, raceName: 'Debut' }],
        lastRaceDate: 'Never',
        tier: race.tier,
        eliteRaces: 0
      });
    }
  });

  const N = results.length;
  if (N < 2) return updatedRiders;

  const scaleFactor = 1 / (N - 1); 
  const deltaMap = new Map<string, number>();

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const winnerId = generateRiderId(results[i].riderName);
      const loserId = generateRiderId(results[j].riderName);
      const winner = updatedRiders.get(winnerId)!;
      const loser = updatedRiders.get(loserId)!;
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
      const delta = K_FACTOR * scaleFactor * (1 - expectedWinner);
      deltaMap.set(winnerId, (deltaMap.get(winnerId) || 0) + delta);
      deltaMap.set(loserId, (deltaMap.get(loserId) || 0) - delta);
    }
  }

  // Update ELOs first
  deltaMap.forEach((delta, key) => {
    const rider = updatedRiders.get(key)!;
    const newElo = Math.round(rider.elo + delta);
    
    const updatedPeakElo = Math.max(rider.peakElo, newElo);
    const updatedPeakYear = newElo > rider.peakElo ? raceYear : rider.peakYear;

    updatedRiders.set(key, {
      ...rider,
      elo: newElo,
      peakElo: updatedPeakElo,
      peakYear: updatedPeakYear,
      history: [...rider.history, { date: race.date, value: newElo, raceName: race.name }], 
      lastRaceDate: race.date,
      tier: race.tier
    });
  });

  // Calculate dynamic Elite status
  let maxTierElo = 0;
  updatedRiders.forEach(r => {
    if (r.tier === race.tier && r.elo > maxTierElo) {
      maxTierElo = r.elo;
    }
  });
  
  const eliteThreshold = maxTierElo * 0.9;
  deltaMap.forEach((_, key) => {
    const rider = updatedRiders.get(key)!;
    if (rider.elo >= eliteThreshold) {
      updatedRiders.set(key, {
        ...rider,
        eliteRaces: (rider.eliteRaces || 0) + 1
      });
    }
  });

  return updatedRiders;
};
