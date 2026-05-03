// boardGenerator.ts
// Pure function: สร้าง board 30 ช่องสำหรับ 1 รัน
// Deterministic ถ้าใส่ rng (seeded) — replay ได้ 100%

import type { Square, SquareType } from '../store/gameStore'

// ============ CONFIG ============

const TOTAL_SQUARES = 30
const MIN_TRADE_SQUARES = 4   // Perplexity guard: ทุกรันต้องเจอ Trade ≥ 4 ครั้ง

// MVP distribution (Tier 1) — Trade/Skip/Wisdom/Mystery only
const MVP_DISTRIBUTION: { type: SquareType; weight: number }[] = [
  { type: 'trade',   weight: 45 },
  { type: 'skip',    weight: 25 },
  { type: 'wisdom',  weight: 20 },
  { type: 'mystery', weight: 10 },
]

// ============ PUBLIC API ============

export type GenerateBoardOptions = {
  warmup?: number               // candles เผยให้ดูก่อนเริ่ม (อ่าน context)
  candlesPerSquare?: number     // M5 = 8, H1 = 6, H4 = 6, etc.
  totalSquares?: number
  rng?: () => number            // pass seeded rng for replay
  distribution?: { type: SquareType; weight: number }[]
}

export function generateBoard(opts: GenerateBoardOptions = {}): Square[] {
  const {
    warmup = 50,
    candlesPerSquare = 8,
    totalSquares = TOTAL_SQUARES,
    rng = Math.random,
    distribution = MVP_DISTRIBUTION,
  } = opts

  let types = generateTypeSequence(totalSquares, distribution, rng)

  // Guard: ensure minimum trade squares (re-roll up to 100x, then force)
  let attempts = 0
  while (countOf(types, 'trade') < MIN_TRADE_SQUARES && attempts < 100) {
    types = generateTypeSequence(totalSquares, distribution, rng)
    attempts++
  }
  if (countOf(types, 'trade') < MIN_TRADE_SQUARES) {
    types = forceMinType(types, 'trade', MIN_TRADE_SQUARES, rng)
  }

  // Last square = Boss (always Trade) — แม้ MVP จะยังไม่ใช้ก็ตั้งไว้ก่อน
  types[totalSquares - 1] = 'trade'

  return types.map((type, idx) => ({
    index: idx,
    type,
    candleStart: warmup + idx * candlesPerSquare,
    candleEnd:   warmup + (idx + 1) * candlesPerSquare,
    resolved: false,
  }))
}

// ============ INTERNAL ============

function generateTypeSequence(
  n: number,
  dist: { type: SquareType; weight: number }[],
  rng: () => number,
): SquareType[] {
  const total = dist.reduce((s, d) => s + d.weight, 0)
  const seq: SquareType[] = []
  for (let i = 0; i < n; i++) {
    let r = rng() * total
    for (const d of dist) {
      r -= d.weight
      if (r <= 0) { seq.push(d.type); break }
    }
  }
  return seq
}

function countOf(types: SquareType[], target: SquareType): number {
  return types.filter(t => t === target).length
}

function forceMinType(
  types: SquareType[],
  target: SquareType,
  min: number,
  rng: () => number,
): SquareType[] {
  const out = [...types]
  while (countOf(out, target) < min) {
    const swappable = out
      .map((t, i) => (t !== target ? i : -1))
      .filter(i => i >= 0)
    if (!swappable.length) break
    const idx = swappable[Math.floor(rng() * swappable.length)]
    out[idx] = target
  }
  return out
}

// ============ SEEDED RNG (สำหรับ replay) ============

// Mulberry32 — เล็ก เร็ว เสถียรพอสำหรับเกม
export function createSeededRng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
