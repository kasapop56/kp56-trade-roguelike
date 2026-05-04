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
  const setupClass = classifySetupFull(allCandles, squareStartCandle)

  // SKIP: no trade taken
  if (action === 'skip') {
    return {
      record: {
        squareIndex,
        setupGuess: setupGuess ?? setupClass.type,
        setupActual: setupClass.type,
        setupReason: setupClass.reason,
        setupHasSignal: setupClass.hasSignal,
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
    return buildSkipResult(squareIndex, setupGuess, setupClass, allCandles, squareEndCandle, biasWasCorrect)
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
      setupGuess: setupGuess ?? setupClass.type,
      setupActual: setupClass.type,
      setupReason: setupClass.reason,
      setupHasSignal: setupClass.hasSignal,
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

type SetupClassification = {
  type: SetupType
  reason: string   // Thai — primary language
  reasonEn: string // English fallback
  hasSignal: boolean
}

function classifySetupFull(candles: Candle[], startIdx: number): SetupClassification {
  const lookback = candles.slice(Math.max(0, startIdx - 20), startIdx)

  if (lookback.length < 8) {
    return {
      type: 'instinct',
      reason: 'ข้อมูลไม่พอวิเคราะห์',
      reasonEn: 'Insufficient data',
      hasSignal: false,
    }
  }

  const closes = lookback.map(c => c.close)
  const highs  = lookback.map(c => c.high)
  const lows   = lookback.map(c => c.low)
  const n      = closes.length
  const mid    = Math.floor(n / 2)

  const prevHigh   = Math.max(...highs.slice(0, mid))
  const prevLow    = Math.min(...lows.slice(0, mid))
  const recentHigh = Math.max(...highs.slice(mid))
  const recentLow  = Math.min(...lows.slice(mid))

  const firstClose = closes[0]
  const lastClose  = closes[n - 1]
  const overallChange = (lastClose - firstClose) / firstClose

  // Consecutive same-direction closes in last 5 bars
  const lastDir = closes[n - 1] > closes[n - 2] ? 1 : -1
  let consecutive = 1
  for (let i = n - 2; i >= Math.max(1, n - 6); i--) {
    if ((closes[i] > closes[i - 1] ? 1 : -1) === lastDir) consecutive++
    else break
  }

  // 8-bar recent move
  const recentMoveStart = closes[Math.max(0, n - 9)]
  const recentMove = (lastClose - recentMoveStart) / recentMoveStart

  const breakHigh = recentHigh > prevHigh * 1.001
  const breakLow  = recentLow  < prevLow  * 0.999

  // Score
  let structureScore = breakHigh || breakLow ? 3 : 0
  let trendScore     = (Math.abs(overallChange) > 0.002 ? 2 : 0) + (consecutive >= 3 ? 2 : 0)
  let counterScore   = (Math.abs(recentMove) > 0.003 ? 2 : 0) + (Math.abs(recentMove) > 0.005 ? 1 : 0)

  // Counter only makes sense when opposite to overall trend
  if (Math.sign(recentMove) === Math.sign(overallChange)) counterScore = Math.max(0, counterScore - 1)

  const maxScore = Math.max(structureScore, trendScore, counterScore)

  if (maxScore < 2) {
    return {
      type: 'instinct',
      reason: 'ไม่มีสัญญาณที่ชัดเจน — entry นี้คือการเดา',
      reasonEn: 'No clear signal — this entry is a bet',
      hasSignal: false,
    }
  }

  if (structureScore === maxScore) {
    if (breakHigh) return {
      type: 'structure',
      reason: 'ราคาทะลุแนวต้านสูงสุดของ 20 แท่งล่าสุด',
      reasonEn: 'Price broke above the 20-bar resistance high',
      hasSignal: true,
    }
    return {
      type: 'structure',
      reason: 'ราคาทะลุแนวรับต่ำสุดของ 20 แท่งล่าสุด',
      reasonEn: 'Price broke below the 20-bar support low',
      hasSignal: true,
    }
  }

  if (trendScore === maxScore) {
    if (consecutive >= 3) {
      const dirTh = lastDir > 0 ? 'ขึ้น' : 'ลง'
      const dirEn = lastDir > 0 ? 'up' : 'down'
      return {
        type: 'with_trend',
        reason: `ราคาวิ่ง${dirTh}ต่อเนื่อง ${consecutive} แท่ง`,
        reasonEn: `${consecutive} consecutive ${dirEn} bars`,
        hasSignal: true,
      }
    }
    const dirTh = overallChange > 0 ? 'ขาขึ้น' : 'ขาลง'
    const dirEn = overallChange > 0 ? 'uptrend' : 'downtrend'
    return {
      type: 'with_trend',
      reason: `มี ${dirTh}ชัดเจนใน 20 แท่งล่าสุด`,
      reasonEn: `Clear ${dirEn} over last 20 bars`,
      hasSignal: true,
    }
  }

  // counterScore === maxScore
  const dirTh = recentMove > 0 ? 'ขึ้น' : 'ลง'
  const dirEn = recentMove > 0 ? 'up' : 'down'
  return {
    type: 'counter',
    reason: `ราคาวิ่ง${dirTh}มาแรงใน 8 แท่ง — โอกาส counter move`,
    reasonEn: `Strong 8-bar move ${dirEn} — potential counter move`,
    hasSignal: true,
  }
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
  setupClass: SetupClassification,
  candles: Candle[],
  squareEndCandle: number,
  biasWasCorrect: boolean,
): SimulateTradeResult {
  return {
    record: {
      squareIndex,
      setupGuess: setupGuess ?? setupClass.type,
      setupActual: setupClass.type,
      setupReason: setupClass.reason,
      setupHasSignal: setupClass.hasSignal,
      action: 'skip',
      outcome: 'skip',
      rMultiple: 0,
      session: getSession(candles[squareEndCandle - 1]?.time ?? 0),
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
