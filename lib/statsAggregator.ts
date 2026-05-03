import type { Run, Stats, SetupType, Session } from '@/store/gameStore'

export function aggregateStats(prev: Stats, run: Run): Stats {
  const trades = run.trades.filter(t => t.outcome !== 'skip')
  const allTrades = run.trades

  // Bias accuracy
  const biasTotal   = run.biasHistory.length
  const biasCorrect = run.biasHistory.filter(b => b.correct).length
  const runBiasAcc  = biasTotal > 0 ? biasCorrect / biasTotal : 0
  const totalRuns   = prev.totalRuns + 1
  const avgBiasAccuracy =
    (prev.avgBiasAccuracy * prev.totalRuns + runBiasAcc) / totalRuns

  // winRateBySetup
  const winRateBySetup = { ...prev.winRateBySetup } as Stats['winRateBySetup']
  for (const t of trades) {
    const key = t.setupActual as SetupType
    winRateBySetup[key] = {
      wins:  winRateBySetup[key].wins  + (t.outcome === 'win' ? 1 : 0),
      total: winRateBySetup[key].total + 1,
    }
  }

  // winRateBySession
  const winRateBySession = { ...prev.winRateBySession } as Stats['winRateBySession']
  for (const t of trades) {
    const key = t.session as Session
    winRateBySession[key] = {
      wins:  winRateBySession[key].wins  + (t.outcome === 'win' ? 1 : 0),
      total: winRateBySession[key].total + 1,
    }
  }

  // Tilt index: winrate after 2 consecutive losses
  const tiltIndex = calcTiltIndex(run.trades)

  // Patience score: % of trade squares that were SKIPped
  const tradeSquares = allTrades.length
  const skipped      = allTrades.filter(t => t.outcome === 'skip').length
  const runPatience  = tradeSquares > 0 ? skipped / tradeSquares : 0
  const patienceScore =
    (prev.patienceScore * prev.totalRuns + runPatience) / totalRuns

  return {
    totalRuns,
    avgBiasAccuracy,
    winRateBySetup,
    winRateBySession,
    tiltIndex,
    patienceScore,
  }
}

// ============ HELPERS ============

function calcTiltIndex(trades: Run['trades']): number {
  // % of trades where player lost, AND the previous 2 trades were also losses
  const active = trades.filter(t => t.outcome !== 'skip')
  if (active.length < 3) return 0

  let tiltOpportunities = 0
  let tiltLosses = 0

  for (let i = 2; i < active.length; i++) {
    const prev2 = active[i - 2].outcome === 'loss'
    const prev1 = active[i - 1].outcome === 'loss'
    if (prev2 && prev1) {
      tiltOpportunities++
      if (active[i].outcome === 'loss') tiltLosses++
    }
  }

  return tiltOpportunities > 0 ? tiltLosses / tiltOpportunities : 0
}
