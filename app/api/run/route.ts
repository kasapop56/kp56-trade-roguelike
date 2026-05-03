import { NextRequest, NextResponse } from 'next/server'
import { createSeededRng } from '@/lib/boardGenerator'
import type { Candle } from '@/store/gameStore'

// MVP: generate synthetic XAUUSD-like candles from a seed.
// Phase 4+ will replace this with real Dukascopy data from Supabase.

const CANDLE_COUNT = 300   // warmup(50) + 30 squares × 8 = 290, buffer 10
const BASE_PRICE   = 2300  // approximate XAUUSD price range

export async function GET(req: NextRequest) {
  const seed = req.nextUrl.searchParams.get('seed') ?? 'default'
  const candles = generateCandles(seed, CANDLE_COUNT)
  return NextResponse.json(candles)
}

// ============ SYNTHETIC DATA (seed-deterministic) ============

function generateCandles(seed: string, count: number): Candle[] {
  const rng    = createSeededRng(seed)
  const candles: Candle[] = []

  // Start time: 2024-01-02 00:00 UTC (arbitrary but fixed for all seeds)
  const M5_SEC  = 5 * 60
  let   time    = 1704153600  // unix timestamp
  let   price   = BASE_PRICE + (rng() - 0.5) * 200

  // Simple random walk with mild trend + volatility clusters
  let   trend   = (rng() - 0.5) * 0.3   // slight directional bias
  let   vol     = 1.5 + rng() * 2        // base volatility in $

  for (let i = 0; i < count; i++) {
    // Occasionally shift trend + vol (regime change)
    if (i % 40 === 0) {
      trend = (rng() - 0.5) * 0.4
      vol   = 1.0 + rng() * 3
    }

    const range = vol * (0.5 + rng() * 1.5)
    const body  = range * (0.3 + rng() * 0.6)
    const isBull = rng() + trend * 0.5 > 0.5

    const open  = price
    const close = open + (isBull ? body : -body)
    const high  = Math.max(open, close) + range * rng() * 0.4
    const low   = Math.min(open, close) - range * rng() * 0.4

    candles.push({
      time,
      open:  round(open),
      high:  round(high),
      low:   round(low),
      close: round(close),
    })

    price = close
    time += M5_SEC
  }

  return candles
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
