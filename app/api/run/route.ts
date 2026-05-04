import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Candle } from '@/store/gameStore'

const CANDLES_PER_RUN = 400   // 120 warmup + 30 squares × 8 + 40 buffer

// Load once at module init (cached across requests in the same worker)
let _allCandles: Candle[] | null = null
function allCandles(): Candle[] {
  if (!_allCandles) {
    const raw = readFileSync(join(process.cwd(), 'data', 'xauusd-m5.json'), 'utf8')
    _allCandles = JSON.parse(raw) as Candle[]
  }
  return _allCandles
}

// Simple deterministic hash: seed string → integer
function seedToOffset(seed: string, max: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h % max
}

export async function GET(req: NextRequest) {
  const seed    = req.nextUrl.searchParams.get('seed') ?? 'default'
  const candles = allCandles()

  const maxStart = candles.length - CANDLES_PER_RUN
  if (maxStart <= 0) {
    return NextResponse.json({ error: 'dataset too small' }, { status: 500 })
  }

  const start = seedToOffset(seed, maxStart)
  const slice = candles.slice(start, start + CANDLES_PER_RUN)

  return NextResponse.json(slice)
}
