



export const workerBlobCode = `
  self.onmessage = function(e) {
    const { 
      races, 
      INITIAL_ELO, 
      STANDARD_K,
      PROVISIONAL_K,
      PROVISIONAL_RACES,
      version, 
      provisionalInit, 
      mulliganEnabled, 
      mulliganCap, 
      churnDecayEnabled, 
      decayOffset 
    } = e.data;
    
    function generateRiderId(name) {
      return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    }

    // Strict sort: Date ASC
    const sorted = races.sort((a, b) => a.date.localeCompare(b.date));

    // --- PRE-PROCESS RETENTION RATES ---
    const yearToRiders = {};
    sorted.forEach(race => {
      const yr = race.date.split('-')[0];
      if (!yearToRiders[yr]) yearToRiders[yr] = new Set();
      race.results.forEach(res => {
        yearToRiders[yr].add(generateRiderId(res.riderName));
      });
    });

    const retentionRates = {}; // rate for transition INTO a year
    const uniqueYears = Object.keys(yearToRiders).sort();
    for (let i = 1; i < uniqueYears.length; i++) {
      const prevYear = uniqueYears[i-1];
      const currYear = uniqueYears[i];
      const prevSet = yearToRiders[prevYear];
      const currSet = yearToRiders[currYear];
      
      let intersectionCount = 0;
      prevSet.forEach(id => {
        if (currSet.has(id)) intersectionCount++;
      });
      
      const rate = prevSet.size > 0 ? (intersectionCount / prevSet.size) : 0.85;
      // Clamp rate to sane range (0.5 to 0.95) to prevent extreme mathematical swings
      retentionRates[currYear] = Math.max(0.5, Math.min(0.95, rate));
    }
    // ------------------------------------

    const riders = {};
    const globalInsights = [];
    let currentYear = null;

    sorted.forEach(race => {
      const raceYear = race.date.split('-')[0];

      // Detect New Season for Churn Decay
      if (churnDecayEnabled && currentYear && raceYear > currentYear) {
        // Calculate the Real Mean ELO of all riders currently in the database
        let totalElo = 0;
        let riderCount = 0;
        const riderIds = Object.keys(riders);
        
        riderIds.forEach(id => {
          totalElo += riders[id].elo;
          riderCount++;
        });

        const MEAN_ELO = riderCount > 0 ? (totalElo / riderCount) : INITIAL_ELO;
        
        // Use the calculated historical retention rate for this specific transition + User Offset
        const baseRate = retentionRates[raceYear] || 0.85;
        const dynamicRate = Math.max(0.1, Math.min(1.0, baseRate + (decayOffset || 0)));
        
        riderIds.forEach(id => {
          const r = riders[id];
          const distance = r.elo - MEAN_ELO;
          r.elo = Math.round(MEAN_ELO + (distance * dynamicRate));
        });
      }
      currentYear = raceYear;

      const results = [...race.results].sort((a, b) => a.position - b.position);
      
      // Calculate averages for provisional boost based on established riders in this specific race
      let avg1to5 = INITIAL_ELO; 
      let avg7to12 = INITIAL_ELO; 
      
      const establishedRidersInRace = results.filter(res => !!riders[generateRiderId(res.riderName)]);
      
      const set1to5 = establishedRidersInRace.filter(r => r.position >= 1 && r.position <= 5);
      if (set1to5.length > 0) {
        avg1to5 = Math.round(set1to5.reduce((sum, r) => sum + riders[generateRiderId(r.riderName)].elo, 0) / set1to5.length);
      }
      
      const set7to12 = establishedRidersInRace.filter(r => r.position >= 7 && r.position <= 12);
      if (set7to12.length > 0) {
        avg7to12 = Math.round(set7to12.reduce((sum, r) => sum + riders[generateRiderId(r.riderName)].elo, 0) / set7to12.length);
      }

      results.forEach(res => {
        const id = generateRiderId(res.riderName);
        if (!riders[id]) {
          let startingElo = INITIAL_ELO; 
          
          if (provisionalInit) {
            if (res.position <= 2) startingElo = avg1to5;
            else if (res.position <= 10) startingElo = avg7to12;
            else startingElo = INITIAL_ELO;
          }

          riders[id] = {
            id,
            name: res.riderName.trim(),
            elo: startingElo,
            peakElo: startingElo,
            peakYear: raceYear,
            history: [{ date: race.date, value: startingElo, raceName: 'Debut' }],
            lastRaceDate: 'Never',
            tier: race.tier,
            tierCounts: { PREMIER: 0, LITES: 0, OPEN: 0 },
            tierWins: { PREMIER: 0, LITES: 0, OPEN: 0 },
            tierTop3s: { PREMIER: 0, LITES: 0, OPEN: 0 },
            tierTop5s: { PREMIER: 0, LITES: 0, OPEN: 0 },
            tierTop10s: { PREMIER: 0, LITES: 0, OPEN: 0 },
            tierEliteRaces: { PREMIER: 0, LITES: 0, OPEN: 0 },
            eliteRaces: 0,
            volatility: 0,
            recentDeltas: [],
            nemesisMap: {},
            mulligansUsed: 0
          };
        }
        
        // Update Participation Counts
        if (riders[id].tierCounts) riders[id].tierCounts[race.tier]++;
        
        // Update Win Counts
        if (res.position === 1) {
           if (riders[id].tierWins) riders[id].tierWins[race.tier]++;
        }

        // Update Top X Counts
        if (res.position <= 3 && riders[id].tierTop3s) riders[id].tierTop3s[race.tier]++;
        if (res.position <= 5 && riders[id].tierTop5s) riders[id].tierTop5s[race.tier]++;
        if (res.position <= 10 && riders[id].tierTop10s) riders[id].tierTop10s[race.tier]++;
      });

      const N = results.length;
      if (N < 2) return;

      const scaleFactor = 1 / (N - 1);
      const deltas = {};

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const wId = generateRiderId(results[i].riderName);
          const lId = generateRiderId(results[j].riderName);
          const winner = riders[wId];
          const loser = riders[lId];

          // --- DYNAMIC K-FACTOR LOGIC ---
          // Determine if winner/loser is still in "Provisional" (Rookie) period
          const winnerK = winner.history.length <= PROVISIONAL_RACES ? PROVISIONAL_K : STANDARD_K;
          let loserK = loser.history.length <= PROVISIONAL_RACES ? PROVISIONAL_K : STANDARD_K;

          // --- MULLIGAN LOGIC ---
          // Mulligan now modifies the *calculated* base K factor for the loser
          if (mulliganEnabled) {
            const cap = mulliganCap !== undefined ? mulliganCap : 25;
            if (loser.mulligansUsed < cap) {
              const isLoserElite = loser.elo > (INITIAL_ELO + 300);
              const isCatastrophe = results[j].position > (N * 0.75); // Bottom 25%
              
              if (isLoserElite && isCatastrophe) {
                // Dampen the rating loss for elite riders having a bad day
                loserK = loserK * 0.5; 
                loser.mulligansUsed++;
              }
            }
          }

          const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
          const expectedLoser = 1 - expectedWinner;
          
          const deltaWin = winnerK * scaleFactor * (1 - expectedWinner);
          const deltaLoss = loserK * scaleFactor * (0 - expectedLoser);

          deltas[wId] = (deltas[wId] || 0) + deltaWin;
          deltas[lId] = (deltas[lId] || 0) + deltaLoss;

          // Nemesis Tracking
          winner.nemesisMap[loser.name] = (winner.nemesisMap[loser.name] || 0) + deltaWin;
          loser.nemesisMap[winner.name] = (loser.nemesisMap[winner.name] || 0) + deltaLoss;
        }
      }

      // First Pass: Update ELO and Metrics
      Object.keys(deltas).forEach(id => {
        const r = riders[id];
        const change = deltas[id];
        const newElo = Math.round(r.elo + change);
        
        r.recentDeltas.push(change);
        if (r.recentDeltas.length > 10) r.recentDeltas.shift();
        
        if (r.recentDeltas.length > 1) {
          const mean = r.recentDeltas.reduce((a, b) => a + b, 0) / r.recentDeltas.length;
          const variance = r.recentDeltas.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / r.recentDeltas.length;
          r.volatility = Math.sqrt(variance);
        }

        if (newElo > r.peakElo) {
          r.peakElo = newElo;
          r.peakYear = raceYear;
        }

        r.elo = newElo;
        r.history.push({ date: race.date, value: newElo, raceName: race.name });
        r.lastRaceDate = race.date;
        r.tier = race.tier;
      });

      // Second Pass: Calculate Elite Longevity relative to the Tier Leader at this time
      let maxTierElo = 0;
      for (const rId in riders) {
        if (riders[rId].tier === race.tier && riders[rId].elo > maxTierElo) {
          maxTierElo = riders[rId].elo;
        }
      }
      
      const eliteThreshold = maxTierElo * 0.9;
      Object.keys(deltas).forEach(id => {
        if (riders[id].elo >= eliteThreshold) {
          riders[id].eliteRaces++; // Global
          if (riders[id].tierEliteRaces) riders[id].tierEliteRaces[race.tier]++; // Per Tier
        }
      });

      // Global Era Metrics
      const currentRanking = Object.values(riders).sort((a, b) => b.elo - a.elo);
      if (currentRanking.length >= 10) {
        const top10Avg = currentRanking.slice(0, 10).reduce((acc, curr) => acc + curr.elo, 0) / 10;
        const gap = currentRanking[0].elo - currentRanking[1].elo;
        const chasePackAvg = currentRanking.slice(1, 6).reduce((acc, curr) => acc + curr.elo, 0) / 5;
        
        globalInsights.push({
          date: race.date,
          avgTop10: Math.round(top10Avg),
          dominanceGap: Math.round(gap),
          leader: currentRanking[0].name,
          runnerUp: currentRanking[1].name,
          chasePackAvg: Math.round(chasePackAvg)
        });
      }
    });

    self.postMessage({ riders, globalInsights, version });
  };
`;