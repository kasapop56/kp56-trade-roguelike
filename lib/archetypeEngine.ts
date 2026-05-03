import type { Stats, Run } from '@/store/gameStore'

export type Archetype =
  | 'Breakout Chaser'
  | 'Fearful Skipper'
  | 'Tilt Trader'
  | 'Patient Pullback Trader'
  | 'Range Bouncer'
  | 'Balanced Trader'

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
  diagnosis: string[]        // 2-4 bullet insights
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

  if (best === 'breakout')  return 'Breakout Chaser'
  if (best === 'pullback' && patienceScore > 0.2) return 'Patient Pullback Trader'
  if (best === 'range')     return 'Range Bouncer'

  const winrate = trades.length > 0
    ? trades.filter(t => t.outcome === 'win').length / trades.length
    : 0
  return winrate >= 0.5 ? 'Balanced Trader' : 'Breakout Chaser'
}

// ============ DIAGNOSIS ============

function buildDiagnosis(run: Run, biasAccuracy: number, roi: number): string[] {
  const lines: string[] = []
  const active = run.trades.filter(t => t.outcome !== 'skip')
  const skips  = run.trades.filter(t => t.outcome === 'skip').length
  const total  = run.trades.length

  if (total === 0) return ['No trades taken this run']

  // Bias
  if (biasAccuracy >= 0.6)
    lines.push(`Bias accuracy ${pct(biasAccuracy)} — strong pattern recognition`)
  else if (biasAccuracy > 0)
    lines.push(`Bias accuracy ${pct(biasAccuracy)} — work on reading next candle direction`)

  // Skip rate
  const skipRate = total > 0 ? skips / total : 0
  if (skipRate > 0.5)
    lines.push(`Skipped ${pct(skipRate)} of trade squares — may be over-filtering`)
  else if (skipRate < 0.1 && active.length > 3)
    lines.push(`Took almost every trade — consider being more selective`)

  // Session
  const sessionWins: Record<string, { w: number; t: number }> = { asia: {w:0,t:0}, london: {w:0,t:0}, ny: {w:0,t:0} }
  for (const t of active) {
    sessionWins[t.session].t++
    if (t.outcome === 'win') sessionWins[t.session].w++
  }
  const bestSession  = bestKey(sessionWins)
  const worstSession = worstKey(sessionWins)
  if (bestSession  && sessionWins[bestSession].t >= 2)
    lines.push(`Best session: ${bestSession.toUpperCase()} ${pct(sessionWins[bestSession].w / sessionWins[bestSession].t)} winrate`)
  if (worstSession && worstSession !== bestSession && sessionWins[worstSession].t >= 2)
    lines.push(`Weakest session: ${worstSession.toUpperCase()} — consider avoiding`)

  // ROI
  if (roi > 0.1)       lines.push(`Strong run: +${pct(roi)} ROI`)
  else if (roi < -0.2) lines.push(`Rough run: ${pct(roi)} ROI — review risk management`)

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
