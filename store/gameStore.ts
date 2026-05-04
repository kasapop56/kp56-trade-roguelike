// gameStore.ts — Zustand + persist (localStorage)
// MVP scope: M5 fixed, 30 squares, Trade/Skip/Wisdom/Mystery

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateBoard, createSeededRng } from '../lib/boardGenerator'
import { simulateTrade, type SimulateTradeResult } from '../lib/tradeSimulator'
import { aggregateStats as mergeStats } from '../lib/statsAggregator'
import { buildRunSummary, type RunSummary } from '../lib/archetypeEngine'
import type { Language } from '../lib/i18n'

// ============ TYPES ============

export type Candle = {
  time: number
  open: number; high: number; low: number; close: number
}

export type SquareType  = 'trade' | 'skip' | 'wisdom' | 'mystery'
export type SetupType   = 'with_trend' | 'counter' | 'structure' | 'instinct'
export type BiasGuess   = 'up' | 'down'
export type TradeAction = 'buy' | 'sell' | 'skip'
export type Session     = 'asia' | 'london' | 'ny'
export type PerkType    = 'iron_will' | 'sniper' | 'extra_skip' | 'bull_vision' | 'second_chance'

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
  setupReason: string
  setupHasSignal: boolean
  action: TradeAction
  outcome: 'win' | 'loss' | 'skip'
  rMultiple: number
  session: Session
  biasWasCorrect: boolean
}

export type MysteryOutcome = {
  direction: 'gain' | 'loss'
  rMultiple: number       // 1 or 2
  equityDelta: number
}

export type PendingTrade = {
  result: SimulateTradeResult
  finalEquityDelta: number   // includes perk bonuses applied
  perkConsumed: boolean
}

export type Run = {
  seed: string
  candles: Candle[]
  squares: Square[]

  currentSquareIndex: number
  revealedCandleIndex: number
  equity: number
  startingEquity: number

  biasHistory: Array<{ guess: BiasGuess; actual: BiasGuess; correct: boolean; refPrice: number }>
  trades: TradeRecord[]

  // turn-state
  pendingBiasGuess: BiasGuess | null
  biasRefPrice: number | null
  diceValue: number | null
  previewableSquares: number[]
  awaitingTradeDecision: boolean

  // perk state
  activePerk: PerkType | null
  pendingWisdomChoices: PerkType[] | null   // non-null while player must choose
  freeSkipsRemaining: number
  pendingMysteryOutcome: MysteryOutcome | null

  // trade resolution state (set after BUY/SELL, cleared after Continue)
  pendingTrade: PendingTrade | null
}

export type Stats = {
  totalRuns: number
  avgBiasAccuracy: number
  winRateBySetup: Partial<Record<SetupType, { wins: number; total: number }>>
  winRateBySession: Record<Session, { wins: number; total: number }>
  tiltIndex: number
  patienceScore: number
}

// ============ CONSTANTS ============

const WARMUP_CANDLES     = 120
const CANDLES_PER_SQUARE = 8
const STARTING_EQUITY    = 1000
const RISK_PER_TRADE     = 0.10
const BIAS_DAMAGE_REDUCTION = 0.5

const ALL_PERKS: PerkType[] = ['iron_will', 'sniper', 'extra_skip', 'bull_vision', 'second_chance']

// ============ STORE ============

type Store = {
  run: Run | null
  stats: Stats
  lastRunSummary: RunSummary | null
  settings: { sound: boolean; animations: boolean; colorBlind: boolean; silentMode: boolean; language: Language }

  startRun: (seed: string) => Promise<void>
  setBiasGuess: (g: BiasGuess) => void
  rollDice: () => void
  selectLandingSquare: (idx: number) => void
  selectPerk: (perk: PerkType) => void
  dismissMysteryOutcome: () => void
  decideTrade: (a: TradeAction, setupGuess?: SetupType | null) => void
  confirmTradeResult: () => void
  endRun: () => void
  dismissScorecard: () => void
  toggleSound: () => void
  setLanguage: (lang: Language) => void
}

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      run: null,
      stats: emptyStats(),
      lastRunSummary: null,
      settings: { sound: true, animations: true, colorBlind: false, silentMode: false, language: 'th' },

      startRun: async (seed) => {
        const candles = await fetchCandles(seed)
        const rng     = createSeededRng(seed)
        const squares = generateBoard({ warmup: WARMUP_CANDLES, candlesPerSquare: CANDLES_PER_SQUARE, rng })
        set({
          lastRunSummary: null,
          run: {
            seed, candles, squares,
            currentSquareIndex: -1,
            revealedCandleIndex: WARMUP_CANDLES,
            equity: STARTING_EQUITY,
            startingEquity: STARTING_EQUITY,
            biasHistory: [],
            trades: [],
            pendingBiasGuess: null,
            biasRefPrice: null,
            diceValue: null,
            previewableSquares: [],
            awaitingTradeDecision: false,
            activePerk: null,
            pendingWisdomChoices: null,
            freeSkipsRemaining: 0,
            pendingMysteryOutcome: null,
            pendingTrade: null,
          },
        })
      },

      setBiasGuess: (guess) => {
        const r = get().run; if (!r) return
        const refPrice = r.candles[r.revealedCandleIndex - 1]?.close ?? null
        set({ run: { ...r, pendingBiasGuess: guess, biasRefPrice: refPrice } })
      },

      rollDice: () => {
        const r = get().run; if (!r) return
        // Second Chance perk: allow one reroll (handled by UI — just re-roll normally)
        const value   = 1 + Math.floor(Math.random() * 6)
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

        const square     = r.squares[idx]
        const biasResult = resolveBias(r, square.candleEnd)
        const updatedSquares = r.squares.map((s, i) =>
          i === idx ? { ...s, resolved: true } : s
        )

        const base: Run = {
          ...r,
          currentSquareIndex: idx,
          revealedCandleIndex: square.candleEnd,
          diceValue: null,
          previewableSquares: [],
          pendingBiasGuess: null,
          squares: updatedSquares,
          biasHistory: biasResult ? [...r.biasHistory, biasResult] : r.biasHistory,
          awaitingTradeDecision: false,
          pendingWisdomChoices: null,
          pendingMysteryOutcome: null,
        }

        if (square.type === 'trade') {
          set({ run: { ...base, awaitingTradeDecision: true } })

        } else if (square.type === 'wisdom') {
          const choices = pickWisdomChoices(r.activePerk)
          set({ run: { ...base, pendingWisdomChoices: choices } })

        } else if (square.type === 'mystery') {
          const outcome = resolveMystery(r.equity, RISK_PER_TRADE)
          set({
            run: {
              ...base,
              equity: Math.max(0, r.equity + outcome.equityDelta),
              pendingMysteryOutcome: outcome,
            },
          })

        } else {
          // skip square — nothing special
          set({ run: base })
        }
      },

      selectPerk: (perk) => {
        const r = get().run; if (!r) return
        set({
          run: {
            ...r,
            activePerk: perk,
            pendingWisdomChoices: null,
            freeSkipsRemaining: perk === 'extra_skip' ? r.freeSkipsRemaining + 1 : r.freeSkipsRemaining,
          },
        })
      },

      dismissMysteryOutcome: () => {
        const r = get().run; if (!r) return
        set({ run: { ...r, pendingMysteryOutcome: null } })
      },

      decideTrade: (action, setupGuess = null) => {
        const r  = get().run; if (!r) return
        const sq = r.squares[r.currentSquareIndex]
        if (!sq) return

        const lastBias = r.biasHistory.at(-1)

        // Perk modifiers
        let extraDamageReduction = 0
        let bonusROnWin = 0
        let perkConsumed = false

        if (r.activePerk === 'iron_will' && action !== 'skip') {
          extraDamageReduction = 0.25; perkConsumed = true
        }
        if (r.activePerk === 'sniper' && action !== 'skip') {
          bonusROnWin = 0.5; perkConsumed = true
        }
        if (r.activePerk === 'bull_vision') {
          perkConsumed = true
        }

        const result = simulateTrade({
          action,
          squareIndex: r.currentSquareIndex,
          squareStartCandle: sq.candleStart,
          squareEndCandle: sq.candleEnd,
          allCandles: r.candles,
          equity: r.equity,
          riskFraction: RISK_PER_TRADE,
          biasWasCorrect: lastBias?.correct ?? false,
          biasDamageReduction: BIAS_DAMAGE_REDUCTION + extraDamageReduction,
          setupGuess,
        })

        const finalEquityDelta = result.equityDelta > 0
          ? result.equityDelta + bonusROnWin * r.equity * RISK_PER_TRADE
          : result.equityDelta

        // SKIP: no animation, no overlay → confirm immediately
        if (action === 'skip') {
          set({
            run: {
              ...r,
              trades: [...r.trades, result.record],
              squares: r.squares.map((s, i) => i === r.currentSquareIndex ? { ...s, resolved: true } : s),
              awaitingTradeDecision: false,
              activePerk: perkConsumed ? null : r.activePerk,
            },
          })
          return
        }

        // BUY/SELL: stash pendingTrade, reveal forward candles toward exit (chart animates)
        set({
          run: {
            ...r,
            awaitingTradeDecision: false,
            revealedCandleIndex: result.exitCandleIndex + 1,
            pendingTrade: { result, finalEquityDelta, perkConsumed },
          },
        })
      },

      confirmTradeResult: () => {
        const r = get().run; if (!r || !r.pendingTrade) return
        const { result, finalEquityDelta, perkConsumed } = r.pendingTrade

        set({
          run: {
            ...r,
            equity: Math.max(0, r.equity + finalEquityDelta),
            trades: [...r.trades, result.record],
            squares: r.squares.map((s, i) => i === r.currentSquareIndex ? { ...s, resolved: true } : s),
            activePerk: perkConsumed ? null : r.activePerk,
            pendingTrade: null,
          },
        })
      },

      endRun: () => {
        const r = get().run; if (!r) return
        const newStats   = mergeStats(get().stats, r)
        const summary    = buildRunSummary(r, newStats)
        set({ stats: newStats, run: null, lastRunSummary: summary })
      },

      dismissScorecard: () => set({ lastRunSummary: null }),

      toggleSound: () => set((s) => ({
        settings: { ...s.settings, sound: !s.settings.sound },
      })),

      setLanguage: (lang) => set((s) => ({ settings: { ...s.settings, language: lang } })),
    }),
    {
      name: 'trade-roguelike-v1',
      partialize: (s) => ({ stats: s.stats, settings: s.settings }),
    },
  ),
)

// ============ HELPERS ============

async function fetchCandles(seed: string): Promise<Candle[]> {
  const res = await fetch(`/api/run?seed=${seed}&tf=M5`)
  return res.json()
}

function resolveBias(r: Run, targetEndIdx: number) {
  if (!r.pendingBiasGuess || r.biasRefPrice === null) return null
  const finalCandle = r.candles[targetEndIdx - 1]
  if (!finalCandle) return null
  const actual: BiasGuess = finalCandle.close > r.biasRefPrice ? 'up' : 'down'
  return { guess: r.pendingBiasGuess, actual, correct: r.pendingBiasGuess === actual, refPrice: r.biasRefPrice }
}

function pickWisdomChoices(currentPerk: PerkType | null): PerkType[] {
  const pool = ALL_PERKS.filter(p => p !== currentPerk)
  const shuffled = pool.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

function resolveMystery(equity: number, riskFraction: number): MysteryOutcome {
  const rAmount    = equity * riskFraction
  const rMultiple  = Math.random() > 0.5 ? 2 : 1
  const direction  = Math.random() > 0.5 ? 'gain' : 'loss'
  const equityDelta = direction === 'gain' ? rAmount * rMultiple : -rAmount * rMultiple
  return { direction, rMultiple, equityDelta }
}

function emptyStats(): Stats {
  return {
    totalRuns: 0,
    avgBiasAccuracy: 0,
    winRateBySetup: {
      with_trend: { wins: 0, total: 0 },
      counter:    { wins: 0, total: 0 },
      structure:  { wins: 0, total: 0 },
      instinct:   { wins: 0, total: 0 },
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
