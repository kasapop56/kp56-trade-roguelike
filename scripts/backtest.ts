/**
 * Backtest: for every valid entry point in xauusd-m5.json, classify the setup
 * using the exact same logic as the game (analyzeSignals), simulate a 1:1 ATR
 * trade in the setup's implied direction, and compute real historical win rates.
 *
 * Output: data/setup-stats.json
 * Run:    npx tsx scripts/backtest.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { analyzeSignals, calcATR } from '../lib/tradeSimulator'
import type { Candle } from '../store/gameStore'

// ---- constants (must match tradeSimulator.ts) ----
const ATR_PERIOD    = 14
const ATR_SL_MULT   = 1.5
const ATR_TP_MULT   = 1.5
const FORWARD_LIMIT = 40
const MIN_LOOKBACK  = 21   // analyzeSignals needs 20 bars before entry

// ---- load data ----
const raw     = readFileSync(join(process.cwd(), 'data', 'xauusd-m5.json'), 'utf8')
const candles = JSON.parse(raw) as Candle[]
console.log(`Loaded ${candles.length} candles`)

// ---- accumulators ----
type Bucket = { wins: number; total: number }
const buckets: Record<string, Bucket> = {
  with_trend: { wins: 0, total: 0 },
  counter:    { wins: 0, total: 0 },
  structure:  { wins: 0, total: 0 },
  instinct:   { wins: 0, total: 0 },
}

// ---- helpers ----
function walkForward(
  candles: Candle[],
  entryIdx: number,
  direction: 'buy' | 'sell',
): 'win' | 'loss' {
  const entry   = candles[entryIdx].close
  const atr     = calcATR(candles, entryIdx + 1, ATR_PERIOD)
  const slDist  = atr * ATR_SL_MULT
  const tpDist  = atr * ATR_TP_MULT
  const sl      = direction === 'buy' ? entry - slDist : entry + slDist
  const tp      = direction === 'buy' ? entry + tpDist : entry - tpDist
  const maxFwd  = Math.min(FORWARD_LIMIT, candles.length - entryIdx - 1)

  for (let i = 1; i <= maxFwd; i++) {
    const c = candles[entryIdx + i]
    if (direction === 'buy') {
      if (c.low  <= sl) return 'loss'
      if (c.high >= tp) return 'win'
    } else {
      if (c.high >= sl) return 'loss'
      if (c.low  <= tp) return 'win'
    }
  }
  // Hit time limit without resolution → count as loss (same as game)
  return 'loss'
}

function record(setup: string, outcome: 'win' | 'loss') {
  buckets[setup].total++
  if (outcome === 'win') buckets[setup].wins++
}

// ---- main loop ----
// Step by 5 candles so consecutive entries don't share almost identical context,
// while still giving ~2,600 samples across the dataset.
const STEP = 5

let processed = 0
for (let i = MIN_LOOKBACK; i < candles.length - FORWARD_LIMIT; i += STEP) {
  const s = analyzeSignals(candles, i)

  if (!s.hasEnoughData) {
    record('instinct', walkForward(candles, i, 'buy'))
    continue
  }

  // Determine dominant setup + implied direction
  const sumRaw = s.trendScore + s.counterScore + s.structureScore

  if (sumRaw === 0) {
    // No signal → instinct; test both directions and take the average
    const buyOutcome  = walkForward(candles, i, 'buy')
    const sellOutcome = walkForward(candles, i, 'sell')
    record('instinct', buyOutcome)
    record('instinct', sellOutcome)
    processed++
    continue
  }

  // Pick the highest-scoring signal
  const scores: [string, number][] = [
    ['with_trend', s.trendScore],
    ['counter',    s.counterScore],
    ['structure',  s.structureScore],
  ]
  scores.sort((a, b) => b[1] - a[1])
  const topSetup = scores[0][0]
  const topScore = scores[0][1]
  const secondScore = scores[1][1]

  // Compute confidence the same way getSetupProbabilities does
  const overallStrength = Math.min(1, sumRaw / 6)
  const clarity         = (topScore - secondScore) / sumRaw
  const confidence      = overallStrength * (0.5 + 0.5 * clarity)

  // If confidence is very low, classify as instinct (mirrors game logic)
  if (confidence < 0.15 || topScore === 0) {
    const buyOutcome  = walkForward(candles, i, 'buy')
    const sellOutcome = walkForward(candles, i, 'sell')
    record('instinct', buyOutcome)
    record('instinct', sellOutcome)
    processed++
    continue
  }

  // Implied direction per setup type
  let direction: 'buy' | 'sell'
  if (topSetup === 'with_trend') {
    direction = s.overallChange >= 0 ? 'buy' : 'sell'
  } else if (topSetup === 'counter') {
    // Counter means fading the recent move
    direction = s.recentMove < 0 ? 'buy' : 'sell'
  } else {
    // structure
    direction = s.breakHigh ? 'buy' : 'sell'
  }

  record(topSetup, walkForward(candles, i, direction))
  processed++
}

// ---- output ----
const stats: Record<string, { samples: number; wins: number; winRate: number }> = {}
for (const [setup, b] of Object.entries(buckets)) {
  stats[setup] = {
    samples: b.total,
    wins:    b.wins,
    winRate: b.total > 0 ? Math.round((b.wins / b.total) * 1000) / 1000 : 0,
  }
}

const output = {
  generated:    new Date().toISOString().slice(0, 10),
  dataset:      'xauusd-m5.json',
  totalSamples: Object.values(buckets).reduce((s, b) => s + b.total, 0),
  atrSLMult:    ATR_SL_MULT,
  atrTPMult:    ATR_TP_MULT,
  forwardLimit: FORWARD_LIMIT,
  setups:       stats,
}

const outPath = join(process.cwd(), 'data', 'setup-stats.json')
writeFileSync(outPath, JSON.stringify(output, null, 2))

console.log('\n=== Backtest Results ===')
console.log(`Total entry points tested: ${processed}`)
console.log(`Total samples (incl. instinct double-count): ${output.totalSamples}`)
console.log()
for (const [setup, s] of Object.entries(stats)) {
  const bar = '█'.repeat(Math.round(s.winRate * 20))
  console.log(`${setup.padEnd(12)} ${(s.winRate * 100).toFixed(1)}%  ${bar}  (${s.wins}/${s.samples})`)
}
console.log(`\nWritten to: ${outPath}`)
