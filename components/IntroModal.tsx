'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Slide = {
  icon: string
  title: string
  body: React.ReactNode
}

const SLIDES: Slide[] = [
  {
    icon: '🎲',
    title: 'What is Trade Roguelike?',
    body: (
      <>
        <p>A chart-reading training game for XAUUSD (Gold).</p>
        <p className="mt-2">
          You&apos;ll read <strong className="text-amber-300">real price charts</strong>, predict
          direction, classify the setup, and manage risk across 30 trading squares.
        </p>
        <p className="mt-2">
          Every number you see — win rates, trade outcomes, setup stats — is backed by a
          real backtest on real market data.
        </p>
      </>
    ),
  },
  {
    icon: '📊',
    title: 'The data is real',
    body: (
      <>
        <p>
          All candles are <strong className="text-amber-300">actual XAUUSD 5-minute bars</strong> from
          Feb–May 2026 — 13,496 candles total.
        </p>
        <p className="mt-2">
          No random walk. No synthetic data. Every run draws a random slice of real market history
          you haven&apos;t seen before.
        </p>
        <p className="mt-2 text-slate-500 text-xs">
          Data source: real XAUUSD M5 OHLC bars.
        </p>
      </>
    ),
  },
  {
    icon: '🔮',
    title: 'Bias prediction',
    body: (
      <>
        <p>
          Before each dice roll, predict whether the next candle will close{' '}
          <strong className="text-green-400">UP</strong> or{' '}
          <strong className="text-red-400">DOWN</strong>.
        </p>
        <p className="mt-2">
          Get it right →{' '}
          <strong className="text-emerald-300">your next loss is softened by 50%</strong>.
        </p>
        <p className="mt-2">
          This trains the most fundamental skill in reading charts: directional read on the
          immediate next candle.
        </p>
      </>
    ),
  },
  {
    icon: '🧠',
    title: 'Setup types & real win rates',
    body: (
      <>
        <p>The game classifies the chart context before each trade:</p>
        <div className="mt-3 flex flex-col gap-1.5 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-slate-300">Structure break</span>
            <span className="text-emerald-400">51.3% win rate</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">With trend</span>
            <span className="text-slate-400">48.9% win rate</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Counter move</span>
            <span className="text-emerald-400">~54% win rate</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Instinct (no signal)</span>
            <span className="text-slate-400">49.2% win rate</span>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          These are real backtested win rates from 2,687 trades on the same XAUUSD M5 dataset,
          using 1:1 ATR stop/target.
        </p>
      </>
    ),
  },
  {
    icon: '🗺️',
    title: 'How to play',
    body: (
      <>
        <p>Roll dice → land on a square → act.</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex gap-3 items-start">
            <span className="text-blue-400 shrink-0">🟦 Trade</span>
            <span className="text-slate-300">Read the chart, decide BUY / SELL / SKIP</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-slate-400 shrink-0">⬜ Skip</span>
            <span className="text-slate-300">Free pass, no trade</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-yellow-400 shrink-0">🟨 Wisdom</span>
            <span className="text-slate-300">Choose a perk that changes the game</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-red-400 shrink-0">🟥 Mystery</span>
            <span className="text-slate-300">Random event — good or bad</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Start with $1,000. Risk 2% per trade. Survive all 30 squares.
        </p>
      </>
    ),
  },
  {
    icon: '🚀',
    title: "You're ready",
    body: (
      <>
        <p>
          You&apos;re playing with <strong className="text-amber-300">real market data</strong> and
          real backtest-backed statistics.
        </p>
        <p className="mt-2">
          After each run you&apos;ll see your <strong className="text-white">trading archetype</strong> and
          a diagnosis of how you read the market.
        </p>
        <p className="mt-2">
          Your results are saved. After your first run, we&apos;ll ask for feedback —
          this is a beta and your input shapes the game directly.
        </p>
        <p className="mt-3 text-xs text-slate-500">Good luck.</p>
      </>
    ),
  },
]

export default function IntroModal({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const isFirst = slide === 0
  const isLast  = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden"
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-4 px-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= slide ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="px-6 py-5"
          >
            <p className="text-3xl mb-3">{current.icon}</p>
            <h2 className="text-white font-bold text-lg mb-3">{current.title}</h2>
            <div className="text-slate-300 text-sm leading-relaxed">{current.body}</div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="px-6 pb-5 flex gap-2">
          {!isFirst && (
            <button
              onClick={() => setSlide(s => s - 1)}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400
                         hover:border-slate-400 text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          )}
          {!isLast && (
            <>
              <motion.button
                onClick={() => setSlide(s => s + 1)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400
                           text-slate-900 font-bold text-sm transition-colors"
              >
                Next →
              </motion.button>
              {slide > 0 && (
                <button
                  onClick={onDone}
                  className="px-3 py-2.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Skip
                </button>
              )}
            </>
          )}
          {isLast && (
            <motion.button
              onClick={onDone}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400
                         text-slate-900 font-bold text-sm transition-colors"
            >
              Start playing →
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
