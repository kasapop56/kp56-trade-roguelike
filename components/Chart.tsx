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

export type ChartProps = {
  candles: Candle[]
  revealedCount: number
  warmupCount?: number
  animating?: boolean
  animationSpeedMs?: number
  tradeOverlay?: TradeOverlay | null
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

// ============ COMPONENT ============

export default function Chart({
  candles,
  revealedCount,
  animating = false,
  animationSpeedMs = 200,
  tradeOverlay,
  className = '',
}: ChartProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<IChartApi | null>(null)
  const seriesRef     = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const animTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const revealedRef   = useRef(revealedCount)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const markersRef    = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

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

  // Trade overlay: price lines + markers
  useEffect(() => {
    const series  = seriesRef.current
    const markers = markersRef.current
    if (!series || !markers) return

    // Clear previous overlay
    for (const line of priceLinesRef.current) series.removePriceLine(line)
    priceLinesRef.current = []
    markers.setMarkers([])

    if (!tradeOverlay) return

    const { action, entryPrice, slPrice, tpPrice, entryCandleIndex, exitCandleIndex, outcome, resolved } = tradeOverlay

    // Entry / SL / TP price lines
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

    // Entry marker (at entry candle)
    const entryCandle = candles[entryCandleIndex]
    const exitCandle  = candles[exitCandleIndex]
    if (!entryCandle) return

    const newMarkers: SeriesMarker<Time>[] = [{
      time: entryCandle.time as Time,
      position: action === 'buy' ? 'belowBar' : 'aboveBar',
      color: ENTRY_COLOR,
      shape: action === 'buy' ? 'arrowUp' : 'arrowDown',
      text: action.toUpperCase(),
    }]

    // Exit marker (only after resolved)
    if (resolved && exitCandle) {
      newMarkers.push({
        time: exitCandle.time as Time,
        position: outcome === 'win' ? 'aboveBar' : 'belowBar',
        color: outcome === 'win' ? TP_COLOR : SL_COLOR,
        shape: 'circle',
        text: outcome === 'win' ? '✓ TP' : '✗ SL',
      })
    }

    markers.setMarkers(newMarkers)
  }, [tradeOverlay, candles])

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
