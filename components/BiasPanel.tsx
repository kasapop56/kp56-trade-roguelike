'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { BiasGuess } from '@/store/gameStore'
import { useT } from '@/lib/useT'

export type BiasPanelProps = {
  pending: BiasGuess | null
  streak: number
  lastResult?: 'correct' | 'wrong' | null
  disabled?: boolean
  onGuess: (g: BiasGuess) => void
}

const BUTTON_DEFS: { value: BiasGuess; labelKey: string; icon: string; color: string; active: string }[] = [
  {
    value:    'up',
    labelKey: 'bias.up',
    icon:     '▲',
    color:    'border-green-600 bg-green-900/40 text-green-300 hover:bg-green-800/60',
    active:   'border-green-300 bg-green-600/70 text-white ring-2 ring-green-300/50 shadow-lg shadow-green-500/20',
  },
  {
    value:    'down',
    labelKey: 'bias.down',
    icon:     '▼',
    color:    'border-red-600 bg-red-900/40 text-red-300 hover:bg-red-800/60',
    active:   'border-red-300 bg-red-600/70 text-white ring-2 ring-red-300/50 shadow-lg shadow-red-500/20',
  },
]

export default function BiasPanel({ pending, streak, lastResult, disabled = false, onGuess }: BiasPanelProps) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 uppercase tracking-widest">{t('bias.title')}</p>
        <StreakBadge streak={streak} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-slate-300 font-medium">{t('bias.prompt')}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{t('bias.help')}</p>
      </div>

      <div className="flex gap-2">
        {BUTTON_DEFS.map((btn) => {
          const isActive = pending === btn.value
          return (
            <motion.button
              key={btn.value}
              onClick={() => !disabled && onGuess(btn.value)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.04 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              className={[
                'flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-150',
                isActive ? btn.active : btn.color,
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className="text-2xl leading-none">{btn.icon}</span>
              <span className="text-xs font-bold tracking-widest">{t(btn.labelKey)}</span>
            </motion.button>
          )
        })}
      </div>

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
            {t(lastResult === 'correct' ? 'bias.correct' : 'bias.wrong')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StreakBadge({ streak }: { streak: number }) {
  const { t } = useT()
  if (streak < 2) return null
  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-600 text-amber-400 text-xs"
    >
      🔥 <span>{t('bias.streak', { n: streak })}</span>
    </motion.div>
  )
}
