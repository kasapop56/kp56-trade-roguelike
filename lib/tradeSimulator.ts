import type { Candle, TradeAction, SetupType, Session, TradeRecord } from '@/store/gameStore'

// ============ PUBLIC API ============

export type SimulateTradeInput = {
  action: TradeAction
  squareIndex: number
  squareStartCandle: number   // index into candles array where square begins
  squareEndCandle: number     // index where square ends (entry candle)
  allCandles: Candle[]
  equity: number
  riskFraction: number        // 0.10 = 1R = 10% equity
  biasWasCorrect: boolean
  biasDamageReduction: number // 0.5 → loss reduced by 50%
  setupGuess: SetupType | null
}

export type SimulateTradeResult = {
  record: TradeRecord
  equityDelta: number   // positive = win, negative = loss, 0 = skip
}

export function simulateTrade(input: SimulateTradeInput): SimulateTradeResult {
  const {
    action, squareIndex, squareStartCandle, squareEndCandle,
    allCandles, equity, riskFraction, biasWasCorrect, biasDamageReduction,
    setupGuess,
  } = input

  const rAmount = equity * riskFraction

  // SKIP: no equity change
  if (action === 'skip') {
    return {
      record: {
        squareIndex,
        setupGuess: setupGuess ?? 'breakout',
        setupActual: classifySetup(allCandles, squareStartCandle, squareEndCandle),
        action: 'skip',
        outcome: 'skip',
        rMultiple: 0,
        session: getSession(allCandles[squareEndCandle]?.time ?? 0),
        biasWasCorrect,
      },
      equityDelta: 0,
    }
  }

  const entryCandle = allCandles[squareEndCandle - 1]
  if (!entryCandle) {
    return buildSkipResult(squareIndex, setupGuess, allCandles, squareStartCandle, squareEndCandle, biasWasCorrect)
  }

  const entry   = entryCandle.close
  const atr     = calcATR(allCandles, squareEndCandle, 14)
  const slDist  = atr * 1.5    // SL = 1.5 × ATR
  const tpDist  = atr * 1.5    // TP = same → 1:1 R:R (MVP)

  const slPrice = action === 'buy' ? entry - slDist : entry + slDist
  const tpPrice = action === 'buy' ? entry + tpDist : entry - tpDist

  // Walk forward up to 40 candles after entry
  const forwardCandles = allCandles.slice(squareEndCandle, squareEndCandle + 40)
  let outcome: 'win' | 'loss' = 'loss'

  for (const c of forwardCandles) {
    const hitTP = action === 'buy' ? c.high >= tpPrice : c.low <= tpPrice
    const hitSL = action === 'buy' ? c.low  <= slPrice : c.high >= slPrice

    // If both hit in same candle, conservative: SL wins
    if (hitSL) { outcome = 'loss'; break }
    if (hitTP) { outcome = 'win';  break }
  }

  // Apply bias damage reduction to losses
  let equityDelta: number
  if (outcome === 'win') {
    equityDelta = rAmount
  } else {
    equityDelta = biasWasCorrect ? -rAmount * (1 - biasDamageReduction) : -rAmount
  }

  const setupActual = classifySetup(allCandles, squareStartCandle, squareEndCandle)

  return {
    record: {
      squareIndex,
      setupGuess: setupGuess ?? setupActual,
      setupActual,
      action,
      outcome,
      rMultiple: outcome === 'win' ? 1 : biasWasCorrect ? -(1 - biasDamageReduction) : -1,
      session: getSession(entryCandle.time),
      biasWasCorrect,
    },
    equityDelta,
  }
}

// ============ HELPERS ============

function calcATR(candles: Candle[], endIdx: number, period: number): number {
  const slice = candles.slice(Math.max(0, endIdx - period), endIdx)
  if (slice.length < 2) return 5  // fallback $5
  const trs = slice.slice(1).map((c, i) => {
    const prev = slice[i]
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low  - prev.close),
    )
  })
  return trs.reduce((a, b) => a + b, 0) / trs.length
}

// Simple setup classifier based on recent price structure
function classifySetup(candles: Candle[], startIdx: number, endIdx: number): SetupType {
  const lookback = candles.slice(Math.max(0, startIdx - 20), endIdx)
  if (lookback.length < 5) return 'breakout'

  const highs  = lookback.map(c => c.high)
  const lows   = lookback.map(c => c.low)
  const closes = lookback.map(c => c.close)

  const recentHigh = Math.max(...highs.slice(-5))
  const recentLow  = Math.min(...lows.slice(-5))
  const prevHigh   = Math.max(...highs.slice(0, -5))
  const prevLow    = Math.min(...lows.slice(0, -5))

  const lastClose = closes[closes.length - 1]
  const firstClose = closes[0]

  const isBreakingHigh = recentHigh > prevHigh * 1.001
  const isBreakingLow  = recentLow  < prevLow  * 0.999
  const isUptrend      = lastClose > firstClose * 1.002
  const isDowntrend    = lastClose < firstClose * 0.998
  const range          = (recentHigh - recentLow) / ((recentHigh + recentLow) / 2)

  if (isBreakingHigh || isBreakingLow) return 'breakout'
  if (range < 0.003)                   return 'range'
  if (isUptrend || isDowntrend)        return 'pullback'
  return 'reversal'
}

// Map unix timestamp → Asia / London / NY session (UTC hours)
function getSession(unixSec: number): Session {
  const hour = new Date(unixSec * 1000).getUTCHours()
  if (hour >= 0  && hour < 8)  return 'asia'
  if (hour >= 8  && hour < 16) return 'london'
  return 'ny'
}

function buildSkipResult(
  squareIndex: number,
  setupGuess: SetupType | null,
  candles: Candle[],
  squareStartCandle: number,
  squareEndCandle: number,
  biasWasCorrect: boolean,
): SimulateTradeResult {
  return {
    record: {
      squareIndex,
      setupGuess: setupGuess ?? 'breakout',
      setupActual: classifySetup(candles, squareStartCandle, squareEndCandle),
      action: 'skip',
      outcome: 'skip',
      rMultiple: 0,
      session: 'asia',
      biasWasCorrect,
    },
    equityDelta: 0,
  }
}
