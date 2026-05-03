'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type CandlestickData,
  type Time,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts'
import type { Candle } from '@/store/gameStore'

// ============ TYPES ============

export type ChartProps = {
  candles: Candle[]
  revealedCount: number      // เผยถึงแท่งที่เท่าไหร่ (0-based, exclusive)
  warmupCount?: number       // จำนวน warmup candles (แสดงทั้งหมด ไม่บังคับ reveal)
  highlightFrom?: number     // index เริ่มต้น highlight (ช่องปัจจุบัน)
  highlightTo?: number       // index สิ้นสุด highlight (ช่องปัจจุบัน)
  animating?: boolean        // ถ้า true → animate reveal ทีละแท่ง
  animationSpeedMs?: number  // ms ต่อแท่ง (default 300)
  className?: string
}

// ============ CONSTANTS ============

const CHART_BG      = '#1a1a2e'   // dark navy
const WICK_UP       = '#26a69a'   // teal
const WICK_DOWN     = '#ef5350'   // red
const BODY_UP       = '#26a69a'
const BODY_DOWN     = '#ef5350'
const GRID_COLOR    = '#2a2a3e'
const TEXT_COLOR    = '#9e9e9e'
const HIGHLIGHT_BG  = 'rgba(255, 200, 50, 0.08)'  // amber tint for current square

// ============ COMPONENT ============

export default function Chart({
  candles,
  revealedCount,
  warmupCount = 50,
  highlightFrom,
  highlightTo,
  animating = false,
  animationSpeedMs = 300,
  className = '',
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const revealedRef  = useRef(revealedCount)

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
      upColor:          BODY_UP,
      downColor:        BODY_DOWN,
      borderUpColor:    WICK_UP,
      borderDownColor:  WICK_DOWN,
      wickUpColor:      WICK_UP,
      wickDownColor:    WICK_DOWN,
    } as Partial<CandlestickSeriesOptions>)

    chartRef.current  = chart
    seriesRef.current = series

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
      chartRef.current  = null
      seriesRef.current = null
    }
  }, [])

  // Update candle data when revealedCount changes
  const applyCandles = useCallback((count: number) => {
    if (!seriesRef.current || !candles.length) return
    const visible = candles.slice(0, count).map(toChartCandle)
    seriesRef.current.setData(visible)
    chartRef.current?.timeScale().scrollToRealTime()
  }, [candles])

  // Animate reveal
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

    // Animate from current revealed position to target
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

  // Highlight current square range
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || highlightFrom == null || highlightTo == null) return
    if (!candles[highlightFrom] || !candles[highlightTo]) return

    chart.applyOptions({
      crosshair: {
        vertLine: { style: 0 },
      },
    })

    // lightweight-charts doesn't have native band highlight —
    // mark via price line pair as a visual hint instead
    const series = seriesRef.current
    if (!series) return

    series.createPriceLine({
      price: candles[highlightFrom]?.low ?? 0,
      color: 'rgba(255, 200, 50, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: '▼ square start',
    })
  }, [highlightFrom, highlightTo, candles])

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
