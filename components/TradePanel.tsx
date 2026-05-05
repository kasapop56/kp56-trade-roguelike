'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TradeAction, SetupType } from '@/store/gameStore'
import { useT } from '@/lib/useT'
import setupStats from '@/data/setup-stats.json'

export type TradePanelProps = {
  equity: number
  riskAmount: number
  biasDamageReduction: boolean
  disabled?: boolean
  onAction: (action: TradeAction, setupGuess: SetupType | null) => void
}

const SETUP_VALUES: SetupType[] = ['with_trend', 'counter', 'structure', 'instinct']

export default function TradePanel({ equity, riskAmount, biasDamageReduction, disabled = false, onAction }: TradePanelProps) {
  const { t } = useT()
  const [setupGuess, setSetupGuess] = useState<SetupType | null>(null)
  const [step, setStep] = useState<'setup' | 'action'>('setup')

  function handleSetupSelect(s: SetupType) {
    setSetupGuess(s)
    setStep('action')
  }

  function handleAction(action: TradeAction) {
    onAction(action, setupGuess)
    setSetupGuess(null)
    setStep('setup')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 uppercase tracking-widest">{t('trade.title')}</p>
        {biasDamageReduction && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700 text-emerald-400"
          >
            {t('trade.bonus')}
          </motion.span>
        )}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">{t('trade.help')}</p>

      <div className="flex gap-3 text-xs">
        <div className="flex-1 rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2">
          <p className="text-slate-500">{t('trade.equity')}</p>
          <p className="text-white font-mono font-medium">${equity.toFixed(0)}</p>
        </div>
        <div className="flex-1 rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2">
          <p className="text-slate-500">{t('trade.risk')}</p>
          <p className="text-amber-400 font-mono font-medium">${riskAmount.toFixed(0)}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="flex flex-col gap-2"
          >
            <p className="text-sm text-slate-300">
              {t('trade.setupQ')} <span className="text-slate-600">{t('trade.optional')}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SETUP_VALUES.map((value) => {
                const stat = setupStats.setups[value as keyof typeof setupStats.setups]
                const wr   = stat ? Math.round(stat.winRate * 100) : null
                const lowData = stat ? stat.samples < 100 : false
                const wrColor = wr === null ? 'text-slate-600'
                  : wr >= 53   ? 'text-emerald-400'
                  : wr <= 47   ? 'text-rose-400'
                  : 'text-slate-400'
                return (
                  <motion.button
                    key={value}
                    onClick={() => !disabled && handleSetupSelect(value)}
                    disabled={disabled}
                    whileHover={!disabled ? { scale: 1.03 } : {}}
                    whileTap={!disabled ? { scale: 0.97 } : {}}
                    className={[
                      'rounded-lg border border-slate-600 bg-slate-800/40 px-3 py-2 text-left transition-colors',
                      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-400 hover:bg-slate-700/40 cursor-pointer',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-sm text-slate-200 leading-none">{t(`setup.${value}`)}</p>
                      {wr !== null && (
                        <span className={`text-[11px] font-mono font-bold leading-none shrink-0 ${wrColor}`}>
                          {lowData ? '~' : ''}{wr}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{t(`setup.${value}Desc`)}</p>
                  </motion.button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-600 text-right">{t('setup.wrFootnote')}</p>
            <button
              onClick={() => !disabled && setStep('action')}
              disabled={disabled}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors text-center mt-1"
            >
              {t('trade.skipSetup')}
            </button>
          </motion.div>
        )}

        {step === 'action' && (
          <motion.div
            key="action"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="flex flex-col gap-3"
          >
            {setupGuess && (
              <p className="text-xs text-slate-400">
                {t('trade.setupGuess')} <span className="text-slate-200">{t(`setup.${setupGuess}`)}</span>
              </p>
            )}
            <p className="text-sm text-slate-300">{t('trade.actionQ')}</p>
            <div className="flex gap-2">
              <ActionButton
                label={t('trade.buy')}
                icon="▲"
                color="bg-emerald-900/40 border-emerald-600 text-emerald-300 hover:bg-emerald-800/60"
                disabled={disabled}
                onClick={() => handleAction('buy')}
              />
              <ActionButton
                label={t('trade.sell')}
                icon="▼"
                color="bg-rose-900/40 border-rose-600 text-rose-300 hover:bg-rose-800/60"
                disabled={disabled}
                onClick={() => handleAction('sell')}
              />
              <ActionButton
                label={t('trade.skip')}
                icon="—"
                color="bg-slate-800/40 border-slate-600 text-slate-400 hover:bg-slate-700/60"
                disabled={disabled}
                onClick={() => handleAction('skip')}
              />
            </div>
            <button
              onClick={() => setStep('setup')}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors text-center"
            >
              {t('trade.back')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActionButton({
  label, icon, color, disabled, onClick,
}: {
  label: string; icon: string; color: string; disabled: boolean; onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.93 } : {}}
      className={[
        'flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border-2 font-bold transition-all',
        color,
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-xs tracking-widest">{label}</span>
    </motion.button>
  )
}
