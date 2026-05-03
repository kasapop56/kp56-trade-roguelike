'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { BiasGuess } from '@/store/gameStore'

// ============ TYPES ============

export type BiasPanelProps = {
  pending: BiasGuess | null       // guess ที่เลือกแล้ว (null = ยังไม่เลือก)
  streak: number                  // consecutive correct bias guesses
  lastResult?: 'correct' | 'wrong' | null
  disabled?: boolean
  onGuess: (g: BiasGuess) => void
}

// ============ CONFIG ============

const BUTTONS: { value: BiasGuess; label: string; icon: string; color: string; active: string }[] = [
  {
    value:  'green',
    label:  'Bullish',
    icon:   '▲',
    color:  'border-emerald-700 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/60',
    active: 'border-emerald-400 bg-emerald-800/60 text-emerald-300 ring-2 ring-emerald-400/40',
  },
  {
    value:  'red',
    label:  'Bearish',
    icon:   '▼',
    color:  'border-rose-700 bg-rose-900/30 text-rose-400 hover:bg-rose-900/60',
    active: 'border-rose-400 bg-rose-800/60 text-rose-300 ring-2 ring-rose-400/40',
  },
  {
    value:  'doji',
    label:  'Doji',
    icon:   '—',
    color:  'border-slate-600 bg-slate-800/30 text-slate-400 hover:bg-slate-800/60',
    active: 'border-slate-400 bg-slate-700/60 text-slate-200 ring-2 ring-slate-400/40',
  },
]

// ============ COMPONENT ============

export default function BiasPanel({ pending, streak, lastResult, disabled = false, onGuess }: BiasPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 uppercase tracking-widest">Bias Prediction</p>
        <StreakBadge streak={streak} />
      </div>

      {/* Prompt + help */}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-slate-300 font-medium">Will the next candle close green, red, or doji?</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Required before rolling. Get it right → next losing trade takes only -50% damage. Wrong has no penalty.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {BUTTONS.map((btn) => {
          const isActive = pending === btn.value
          return (
            <motion.button
              key={btn.value}
              onClick={() => !disabled && onGuess(btn.value)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.04 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              className={[
                'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-150',
                isActive ? btn.active : btn.color,
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className="text-lg leading-none">{btn.icon}</span>
              <span className="text-xs">{btn.label}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Last result feedback */}
      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={lastResult}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-xs text-center py-1 rounded-md ${
              lastResult === 'correct'
                ? 'text-emerald-400 bg-emerald-900/30'
                : 'text-slate-500 bg-slate-800/30'
            }`}
          >
            {lastResult === 'correct' ? '✓ Correct! -50% damage next trade' : '✗ Wrong — no penalty'}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ============ SUB-COMPONENTS ============

function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null
  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-600 text-amber-400 text-xs"
    >
      🔥 <span>{streak} streak</span>
    </motion.div>
  )
}
