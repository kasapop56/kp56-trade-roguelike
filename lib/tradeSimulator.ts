import type { Candle, TradeAction, SetupType, Session, TradeRecord } from '@/store/gameStore'

// ============ PUBLIC API ============

export type SimulateTradeInput = {
  action: TradeAction
  squareIndex: number
  squareStartCandle: number
  squareEndCandle: number      // index where square ends → entry candle index
  allCandles: Candle[]
  equity: number
  riskFraction: number
  biasWasCorrect: boolean
  biasDamageReduction: number
  setupGuess: SetupType | null
}

export type SimulateTradeResult = {
  record: TradeRecord
  equityDelta: number
  entryPrice: number
  slPrice: number
  tpPrice: number
  entryCandleIndex: number
  exitCandleIndex: number
  action: TradeAction
  outcome: 'win' | 'loss' | 'skip'
}

const FORWARD_LIMIT = 40

export function simulateTrade(input: SimulateTradeInput): SimulateTradeResult {
  const {
    action, squareIndex, squareStartCandle, squareEndCandle,
    allCandles, equity, riskFraction, biasWasCorrect, biasDamageReduction,
    setupGuess,
  } = input

  const rAmount = equity * riskFraction
  const setupActual = classifySetup(allCandles, squareStartCandle, squareEndCandle)

  // SKIP: no trade taken
  if (action === 'skip') {
    return {
      record: {
        squareIndex,
        setupGuess: setupGuess ?? setupActual,
        setupActual,
        action: 'skip',
        outcome: 'skip',
        rMultiple: 0,
        session: getSession(allCandles[squareEndCandle - 1]?.time ?? 0),
        biasWasCorrect,
      },
      equityDelta: 0,
      entryPrice: 0,
      slPrice: 0,
      tpPrice: 0,
      entryCandleIndex: squareEndCandle - 1,
      exitCandleIndex: squareEndCandle - 1,
      action: 'skip',
      outcome: 'skip',
    }
  }

  // Entry = close of last candle in current square
  const entryCandleIndex = squareEndCandle - 1
  const entryCandle = allCandles[entryCandleIndex]
  if (!entryCandle) {
    return buildSkipResult(squareIndex, setupGuess, allCandles, squareStartCandle, squareEndCandle, biasWasCorrect)
  }

  const entry  = entryCandle.close
  const atr    = calcATR(allCandles, squareEndCandle, 14)
  const slDist = atr * 1.5
  const tpDist = atr * 1.5     // 1:1 R:R for MVP

  const slPrice = action === 'buy' ? entry - slDist : entry + slDist
  const tpPrice = action === 'buy' ? entry + tpDist : entry - tpDist

  // Walk forward to find first SL/TP hit
  const maxForward = Math.min(FORWARD_LIMIT, allCandles.length - squareEndCandle)
  let outcome: 'win' | 'loss' = 'loss'
  let exitCandleIndex = squareEndCandle + maxForward - 1

  for (let i = 0; i < maxForward; i++) {
    const c = allCandles[squareEndCandle + i]
    if (!c) break

    const hitTP = action === 'buy' ? c.high >= tpPrice : c.low <= tpPrice
    const hitSL = action === 'buy' ? c.low  <= slPrice : c.high >= slPrice

    if (hitSL) { outcome = 'loss'; exitCandleIndex = squareEndCandle + i; break }
    if (hitTP) { outcome = 'win';  exitCandleIndex = squareEndCandle + i; break }
  }

  // Loss with correct bias gets damage reduction
  const equityDelta = outcome === 'win'
    ? rAmount
    : biasWasCorrect ? -rAmount * (1 - biasDamageReduction) : -rAmount

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
    entryPrice: entry,
    slPrice,
    tpPrice,
    entryCandleIndex,
    exitCandleIndex,
    action,
    outcome,
  }
}

// ============ HELPERS ============

function calcATR(candles: Candle[], endIdx: number, period: number): number {
  const slice = candles.slice(Math.max(0, endIdx - period), endIdx)
  if (slice.length < 2) return 5
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

  const lastClose  = closes[closes.length - 1]
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
    entryPrice: 0,
    slPrice: 0,
    tpPrice: 0,
    entryCandleIndex: squareEndCandle - 1,
    exitCandleIndex: squareEndCandle - 1,
    action: 'skip',
    outcome: 'skip',
  }
}
