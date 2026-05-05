'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type ISeriesMarkersPluginApi,
  type CandlestickSeriesOptions,
  type CandlestickData,
  type SeriesMarker,
  type Time,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts'
import type { Candle } from '@/store/gameStore'

// ============ TYPES ============

export type TradeOverlay = {
  action: 'buy' | 'sell'
  entryPrice: number
  slPrice: number
  tpPrice: number
  entryCandleIndex: number
  exitCandleIndex: number
  outcome: 'win' | 'loss'
  resolved: boolean       // true → show exit marker
}

export type PastTradeMarker = {
  action: 'buy' | 'sell'
  entryCandleIndex: number
  exitCandleIndex: number
  outcome: 'win' | 'loss'
}

export type ChartProps = {
  candles: Candle[]
  revealedCount: number
  warmupCount?: number
  animating?: boolean
  animationSpeedMs?: number
  tradeOverlay?: TradeOverlay | null
  pastTrades?: PastTradeMarker[]
  biasRefPrice?: number | null
  className?: string
}

// ============ CONSTANTS ============

const CHART_BG    = '#1a1a2e'
const WICK_UP     = '#26a69a'
const WICK_DOWN   = '#ef5350'
const BODY_UP     = '#26a69a'
const BODY_DOWN   = '#ef5350'
const GRID_COLOR  = '#2a2a3e'
const TEXT_COLOR  = '#9e9e9e'

const ENTRY_COLOR = '#fbbf24'    // amber
const SL_COLOR    = '#f43f5e'    // rose
const TP_COLOR    = '#10b981'    // emerald

// Muted versions for past trade markers (so active trade still stands out)
const PAST_ENTRY_COLOR = '#78716c'   // stone-500
const PAST_TP_COLOR    = '#15803d'   // green-700
const PAST_SL_COLOR    = '#9f1239'   // rose-800

// ============ COMPONENT ============

export default function Chart({
  candles,
  revealedCount,
  animating = false,
  animationSpeedMs = 200,
  tradeOverlay,
  pastTrades,
  biasRefPrice,
  className = '',
}: ChartProps) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const chartRef        = useRef<IChartApi | null>(null)
  const seriesRef       = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const animTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const revealedRef     = useRef(revealedCount)
  const priceLinesRef   = useRef<IPriceLine[]>([])
  const markersRef      = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const biasLineRef     = useRef<IPriceLine | null>(null)

  // Build chart on mount
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: TEXT_COLOR,
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: GRID_COLOR },
      timeScale: {
        borderColor: GRID_COLOR,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         BODY_UP,
      downColor:       BODY_DOWN,
      borderUpColor:   WICK_UP,
      borderDownColor: WICK_DOWN,
      wickUpColor:     WICK_UP,
      wickDownColor:   WICK_DOWN,
    } as Partial<CandlestickSeriesOptions>)

    chartRef.current   = chart
    seriesRef.current  = series
    markersRef.current = createSeriesMarkers(series, [])

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return
      chart.applyOptions({
        width:  containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current   = null
      seriesRef.current  = null
      markersRef.current = null
      priceLinesRef.current = []
    }
  }, [])

  // Apply candle data
  const VISIBLE_BARS = 100

  const applyCandles = useCallback((count: number) => {
    if (!seriesRef.current || !candles.length) return
    const visible = candles.slice(0, count).map(toChartCandle)
    seriesRef.current.setData(visible)
    // After setting data, fit to show last VISIBLE_BARS candles
    if (chartRef.current && visible.length >= 2) {
      const from = visible[Math.max(0, visible.length - VISIBLE_BARS)].time
      const to   = visible[visible.length - 1].time
      chartRef.current.timeScale().setVisibleRange({ from, to } as { from: Time; to: Time })
    }
  }, [candles])

  // Animate reveal: when revealedCount increases, walk forward one candle at a time
  useEffect(() => {
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current)
      animTimerRef.current = null
    }

    if (!animating) {
      applyCandles(revealedCount)
      revealedRef.current = revealedCount
      return
    }

    const start  = revealedRef.current
    const target = revealedCount
    if (start >= target) {
      applyCandles(target)
      revealedRef.current = target
      return
    }

    let cur = start
    animTimerRef.current = setInterval(() => {
      cur++
      applyCandles(cur)
      revealedRef.current = cur
      if (cur >= target) {
        clearInterval(animTimerRef.current!)
        animTimerRef.current = null
      }
    }, animationSpeedMs)

    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current)
    }
  }, [revealedCount, animating, animationSpeedMs, applyCandles])

  // Trade overlay: price lines + markers (active + persistent past trades)
  useEffect(() => {
    const series  = seriesRef.current
    const markers = markersRef.current
    if (!series || !markers) return

    // Clear previous price lines
    for (const line of priceLinesRef.current) series.removePriceLine(line)
    priceLinesRef.current = []

    const newMarkers: SeriesMarker<Time>[] = []

    // 1) Persistent markers for past trades (smaller, muted)
    if (pastTrades && pastTrades.length) {
      for (const pt of pastTrades) {
        const entryC = candles[pt.entryCandleIndex]
        const exitC  = candles[pt.exitCandleIndex]
        if (entryC) {
          newMarkers.push({
            time: entryC.time as Time,
            position: pt.action === 'buy' ? 'belowBar' : 'aboveBar',
            color: PAST_ENTRY_COLOR,
            shape: pt.action === 'buy' ? 'arrowUp' : 'arrowDown',
            text: '',
          })
        }
        if (exitC) {
          newMarkers.push({
            time: exitC.time as Time,
            position: pt.outcome === 'win' ? 'aboveBar' : 'belowBar',
            color: pt.outcome === 'win' ? PAST_TP_COLOR : PAST_SL_COLOR,
            shape: 'circle',
            text: pt.outcome === 'win' ? '✓' : '✗',
          })
        }
      }
    }

    // 2) Active trade overlay
    if (tradeOverlay) {
      const { action, entryPrice, slPrice, tpPrice, entryCandleIndex, exitCandleIndex, outcome, resolved } = tradeOverlay

      // Entry / SL / TP price lines (only for the active trade)
      priceLinesRef.current.push(series.createPriceLine({
        price: entryPrice,
        color: ENTRY_COLOR,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `Entry ${entryPrice.toFixed(2)}`,
      }))
      priceLinesRef.current.push(series.createPriceLine({
        price: slPrice,
        color: SL_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SL ${slPrice.toFixed(2)}`,
      }))
      priceLinesRef.current.push(series.createPriceLine({
        price: tpPrice,
        color: TP_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP ${tpPrice.toFixed(2)}`,
      }))

      const entryCandle = candles[entryCandleIndex]
      const exitCandle  = candles[exitCandleIndex]

      if (entryCandle) {
        newMarkers.push({
          time: entryCandle.time as Time,
          position: action === 'buy' ? 'belowBar' : 'aboveBar',
          color: ENTRY_COLOR,
          shape: action === 'buy' ? 'arrowUp' : 'arrowDown',
          text: action.toUpperCase(),
        })
      }

      if (resolved && exitCandle) {
        newMarkers.push({
          time: exitCandle.time as Time,
          position: outcome === 'win' ? 'aboveBar' : 'belowBar',
          color: outcome === 'win' ? TP_COLOR : SL_COLOR,
          shape: 'circle',
          text: outcome === 'win' ? '✓ TP' : '✗ SL',
        })
      }
    }

    // Markers must be sorted by time
    newMarkers.sort((a, b) => Number(a.time) - Number(b.time))
    markers.setMarkers(newMarkers)
  }, [tradeOverlay, pastTrades, candles])

  // Bias reference line — shows where player made their UP/DOWN guess
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    if (biasLineRef.current) {
      series.removePriceLine(biasLineRef.current)
      biasLineRef.current = null
    }
    if (biasRefPrice) {
      biasLineRef.current = series.createPriceLine({
        price: biasRefPrice,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '◎ Bias',
      })
    }
  }, [biasRefPrice])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: 280 }}
    />
  )
}

// ============ HELPER ============

function toChartCandle(c: Candle): CandlestickData<Time> {
  return {
    time:  c.time as Time,
    open:  c.open,
    high:  c.high,
    low:   c.low,
    close: c.close,
  }
}
