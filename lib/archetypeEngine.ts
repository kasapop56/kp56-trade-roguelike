import type { Stats, Run, TradeRecord } from '@/store/gameStore'

export type Archetype =
  | 'Breakout Chaser'
  | 'Fearful Skipper'
  | 'Tilt Trader'
  | 'Patient Pullback Trader'
  | 'Range Bouncer'
  | 'Balanced Trader'

export type DiagnosisEntry = { key: string; params?: Record<string, string | number> }

export type RunSummary = {
  seed: string
  startingEquity: number
  finalEquity: number
  roi: number                // (final - start) / start
  totalTrades: number
  wins: number
  losses: number
  skips: number
  biasAccuracy: number
  rMultiples: number[]
  archetype: Archetype
  diagnosis: DiagnosisEntry[]  // 2-4 bullet insights (translated at render time)
  trades: TradeRecord[]        // full trade log for scorecard review
}

export function buildRunSummary(run: Run, stats: Stats): RunSummary {
  const trades = run.trades
  const active  = trades.filter(t => t.outcome !== 'skip')
  const wins    = active.filter(t => t.outcome === 'win').length
  const losses  = active.filter(t => t.outcome === 'loss').length
  const skips   = trades.filter(t => t.outcome === 'skip').length

  const biasTotal   = run.biasHistory.length
  const biasCorrect = run.biasHistory.filter(b => b.correct).length
  const biasAccuracy = biasTotal > 0 ? biasCorrect / biasTotal : 0

  const roi = (run.equity - run.startingEquity) / run.startingEquity

  const archetype = deriveArchetype(stats, run)
  const diagnosis = buildDiagnosis(run, biasAccuracy, roi)

  return {
    seed: run.seed,
    startingEquity: run.startingEquity,
    finalEquity: run.equity,
    roi,
    totalTrades: active.length,
    wins,
    losses,
    skips,
    biasAccuracy,
    rMultiples: active.map(t => t.rMultiple),
    archetype,
    diagnosis,
    trades: run.trades,
  }
}

// ============ ARCHETYPE ============

function deriveArchetype(stats: Stats, run: Run): Archetype {
  const trades = run.trades.filter(t => t.outcome !== 'skip')
  const skips  = run.trades.filter(t => t.outcome === 'skip').length
  const total  = run.trades.length

  const tiltIndex = stats.tiltIndex
  const patienceScore = total > 0 ? skips / total : 0

  if (tiltIndex > 0.6)    return 'Tilt Trader'
  if (patienceScore > 0.5) return 'Fearful Skipper'

  // Best setup winrate
  const setupWinrates: [string, number][] = Object.entries(stats.winRateBySetup)
    .filter(([, v]) => v.total > 0)
    .map(([k, v]) => [k, v.wins / v.total])

  if (setupWinrates.length === 0) return 'Balanced Trader'

  setupWinrates.sort((a, b) => b[1] - a[1])
  const best = setupWinrates[0][0]

  if (best === 'structure')  return 'Breakout Chaser'
  if (best === 'with_trend' && patienceScore > 0.2) return 'Patient Pullback Trader'
  if (best === 'counter')    return 'Range Bouncer'

  const winrate = trades.length > 0
    ? trades.filter(t => t.outcome === 'win').length / trades.length
    : 0
  return winrate >= 0.5 ? 'Balanced Trader' : 'Breakout Chaser'
}

// ============ DIAGNOSIS ============

function buildDiagnosis(run: Run, biasAccuracy: number, roi: number): DiagnosisEntry[] {
  const lines: DiagnosisEntry[] = []
  const active = run.trades.filter(t => t.outcome !== 'skip')
  const skips  = run.trades.filter(t => t.outcome === 'skip').length
  const total  = run.trades.length

  if (total === 0) return [{ key: 'diag.noTrades' }]

  // Bias
  if (biasAccuracy >= 0.6)
    lines.push({ key: 'diag.biasGood', params: { pct: pct(biasAccuracy) } })
  else if (biasAccuracy > 0)
    lines.push({ key: 'diag.biasWeak', params: { pct: pct(biasAccuracy) } })

  // Skip rate
  const skipRate = total > 0 ? skips / total : 0
  if (skipRate > 0.5)
    lines.push({ key: 'diag.overFilter', params: { pct: pct(skipRate) } })
  else if (skipRate < 0.1 && active.length > 3)
    lines.push({ key: 'diag.tooAggressive' })

  // Session
  const sessionWins: Record<string, { w: number; t: number }> = { asia: {w:0,t:0}, london: {w:0,t:0}, ny: {w:0,t:0} }
  for (const t of active) {
    sessionWins[t.session].t++
    if (t.outcome === 'win') sessionWins[t.session].w++
  }
  const bestSession  = bestKey(sessionWins)
  const worstSession = worstKey(sessionWins)
  if (bestSession && sessionWins[bestSession].t >= 2)
    lines.push({ key: 'diag.bestSession', params: { session: bestSession.toUpperCase(), pct: pct(sessionWins[bestSession].w / sessionWins[bestSession].t) } })
  if (worstSession && worstSession !== bestSession && sessionWins[worstSession].t >= 2)
    lines.push({ key: 'diag.worstSession', params: { session: worstSession.toUpperCase() } })

  // ROI
  if (roi > 0.1)       lines.push({ key: 'diag.roiGood', params: { pct: pct(roi) } })
  else if (roi < -0.2) lines.push({ key: 'diag.roiPoor', params: { pct: pct(roi) } })

  return lines.slice(0, 4)
}

// ============ HELPERS ============

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function bestKey(map: Record<string, { w: number; t: number }>): string | null {
  return Object.entries(map)
    .filter(([, v]) => v.t > 0)
    .sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)[0]?.[0] ?? null
}

function worstKey(map: Record<string, { w: number; t: number }>): string | null {
  return Object.entries(map)
    .filter(([, v]) => v.t > 0)
    .sort((a, b) => a[1].w / a[1].t - b[1].w / b[1].t)[0]?.[0] ?? null
}
