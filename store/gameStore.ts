// gameStore.ts
// Central state สำหรับเกม — ใช้ Zustand + persist (localStorage)
// MVP scope: M5 fixed, 30 squares, Trade/Skip/Wisdom/Mystery only

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateBoard, createSeededRng } from '../lib/boardGenerator'

// ============ TYPES ============

export type Candle = {
  time: number
  open: number; high: number; low: number; close: number
}

export type SquareType = 'trade' | 'skip' | 'wisdom' | 'mystery'
export type SetupType  = 'breakout' | 'pullback' | 'range' | 'reversal'
export type BiasGuess  = 'green' | 'red' | 'doji'
export type TradeAction = 'buy' | 'sell' | 'skip'
export type Session    = 'asia' | 'london' | 'ny'

export type Square = {
  index: number
  type: SquareType
  candleStart: number
  candleEnd: number
  resolved: boolean
}

export type TradeRecord = {
  squareIndex: number
  setupGuess: SetupType
  setupActual: SetupType
  action: TradeAction
  outcome: 'win' | 'loss' | 'skip'
  rMultiple: number
  session: Session
  biasWasCorrect: boolean
}

export type Run = {
  seed: string
  candles: Candle[]
  squares: Square[]

  currentSquareIndex: number     // -1 = ยังไม่เริ่มเดิน
  revealedCandleIndex: number    // เผยถึงแท่งไหนแล้ว
  equity: number
  startingEquity: number

  biasHistory: Array<{ guess: BiasGuess; actual: BiasGuess; correct: boolean }>
  trades: TradeRecord[]

  // turn-state
  pendingBiasGuess: BiasGuess | null
  diceValue: number | null
  previewableSquares: number[]    // Variant C: type ของช่องเหล่านี้เห็นได้
  awaitingTradeDecision: boolean
}

export type Stats = {
  totalRuns: number
  avgBiasAccuracy: number
  winRateBySetup: Record<SetupType, { wins: number; total: number }>
  winRateBySession: Record<Session, { wins: number; total: number }>
  tiltIndex: number
  patienceScore: number
}

// ============ CONSTANTS ============

const WARMUP_CANDLES = 50
const CANDLES_PER_SQUARE = 8       // M5
const STARTING_EQUITY = 1000
const RISK_PER_TRADE = 0.10        // 10% of equity = 1R
const BIAS_DAMAGE_REDUCTION = 0.5  // bias ถูก → loss ลด 50%

// ============ STORE ============

type Store = {
  run: Run | null
  stats: Stats
  settings: {
    sound: boolean
    animations: boolean
    colorBlind: boolean
    silentMode: boolean
  }

  startRun: (seed: string) => Promise<void>
  setBiasGuess: (g: BiasGuess) => void
  rollDice: () => void
  selectLandingSquare: (idx: number) => void
  guessSetup: (s: SetupType) => void
  decideTrade: (a: TradeAction) => void
  endRun: () => void
  toggleSound: () => void
}

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      run: null,
      stats: emptyStats(),
      settings: {
        sound: true,
        animations: true,
        colorBlind: false,
        silentMode: false,
      },

      startRun: async (seed) => {
        const candles = await fetchCandles(seed)
        const rng = createSeededRng(seed)
        const squares = generateBoard({
          warmup: WARMUP_CANDLES,
          candlesPerSquare: CANDLES_PER_SQUARE,
          rng,
        })
        set({
          run: {
            seed, candles, squares,
            currentSquareIndex: -1,
            revealedCandleIndex: WARMUP_CANDLES,
            equity: STARTING_EQUITY,
            startingEquity: STARTING_EQUITY,
            biasHistory: [],
            trades: [],
            pendingBiasGuess: null,
            diceValue: null,
            previewableSquares: [],
            awaitingTradeDecision: false,
          },
        })
      },

      setBiasGuess: (guess) => {
        const r = get().run; if (!r) return
        set({ run: { ...r, pendingBiasGuess: guess } })
      },

      rollDice: () => {
        const r = get().run; if (!r) return
        const value = 1 + Math.floor(Math.random() * 6)
        const preview: number[] = []
        for (let i = 1; i <= value; i++) {
          const t = r.currentSquareIndex + i
          if (t < r.squares.length) preview.push(t)
        }
        set({ run: { ...r, diceValue: value, previewableSquares: preview } })
      },

      selectLandingSquare: (idx) => {
        const r = get().run; if (!r) return
        if (!r.previewableSquares.includes(idx)) return

        const square = r.squares[idx]
        const biasResult = resolveBias(r)

        set({
          run: {
            ...r,
            currentSquareIndex: idx,
            revealedCandleIndex: square.candleEnd,
            diceValue: null,
            previewableSquares: [],
            pendingBiasGuess: null,
            biasHistory: biasResult ? [...r.biasHistory, biasResult] : r.biasHistory,
            awaitingTradeDecision: square.type === 'trade',
          },
        })
      },

      guessSetup: (_s) => { /* TODO Phase 1.5 */ },

      decideTrade: (_action) => { /* TODO: simulateTrade + apply equity */ },

      endRun: () => {
        const r = get().run; if (!r) return
        set({ stats: aggregateStats(get().stats, r), run: null })
      },

      toggleSound: () => set((s) => ({
        settings: { ...s.settings, sound: !s.settings.sound },
      })),
    }),
    {
      name: 'trade-roguelike-v1',
      partialize: (s) => ({ stats: s.stats, settings: s.settings }),
    },
  ),
)

// ============ HELPERS (skeletons) ============

async function fetchCandles(seed: string): Promise<Candle[]> {
  const res = await fetch(`/api/run?seed=${seed}&tf=M5`)
  return res.json()
}

function resolveBias(r: Run) {
  if (!r.pendingBiasGuess) return null
  const next = r.candles[r.revealedCandleIndex + 1]
  if (!next) return null
  const range = next.high - next.low
  const body  = Math.abs(next.close - next.open)
  const actual: BiasGuess =
    body < range * 0.1   ? 'doji' :
    next.close > next.open ? 'green' : 'red'
  return {
    guess: r.pendingBiasGuess,
    actual,
    correct: r.pendingBiasGuess === actual,
  }
}

function aggregateStats(prev: Stats, _r: Run): Stats {
  // TODO: merge trades, bias accuracy, sessions, tilt index
  return { ...prev, totalRuns: prev.totalRuns + 1 }
}

function emptyStats(): Stats {
  return {
    totalRuns: 0,
    avgBiasAccuracy: 0,
    winRateBySetup: {
      breakout: { wins: 0, total: 0 },
      pullback: { wins: 0, total: 0 },
      range:    { wins: 0, total: 0 },
      reversal: { wins: 0, total: 0 },
    },
    winRateBySession: {
      asia:   { wins: 0, total: 0 },
      london: { wins: 0, total: 0 },
      ny:     { wins: 0, total: 0 },
    },
    tiltIndex: 0,
    patienceScore: 0,
  }
}
