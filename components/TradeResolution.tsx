'use client'

import { motion } from 'framer-motion'
import type { PendingTrade, SetupType } from '@/store/gameStore'
import { useT } from '@/lib/useT'

export type TradeResolutionProps = {
  pending: PendingTrade
  biasWasCorrect: boolean
  onContinue: () => void
}

const SETUP_ORDER: SetupType[] = ['with_trend', 'counter', 'structure', 'instinct']

export default function TradeResolution({ pending, biasWasCorrect, onContinue }: TradeResolutionProps) {
  const { t } = useT()
  const { result, finalEquityDelta } = pending
  const isWin     = result.outcome === 'win'
  const isSkip    = result.outcome === 'skip'
  const candleCount = result.exitCandleIndex - result.entryCandleIndex
  const distance = Math.abs(result.entryPrice - (isWin ? result.tpPrice : result.slPrice))

  const actionLabel = result.action === 'buy' ? t('trade.buy') : t('trade.sell')

  const whyText = isWin
    ? t('resolution.whyWin', { dir: result.action === 'buy' ? t('resolution.up') : t('resolution.down') })
    : biasWasCorrect
      ? t('resolution.whyLossSoftened')
      : t('resolution.whyLoss')

  const { setupActual, setupReason, setupHasSignal, setupGuess, setupProbs } = result.record
  const guessedCorrectly = setupGuess === setupActual
  const reasonText = setupReason

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
    >
      {/* Outcome banner */}
      {!isSkip && (
        <div className={`rounded-xl border-2 px-4 py-3 ${isWin ? 'border-emerald-600 bg-emerald-900/20' : 'border-rose-700 bg-rose-900/20'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-bold uppercase tracking-widest ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
              {t(isWin ? 'resolution.tpHit' : 'resolution.slHit')}
            </p>
            <span className={`text-lg font-mono font-bold ${isWin ? 'text-emerald-300' : 'text-rose-300'}`}>
              {finalEquityDelta >= 0 ? '+' : ''}${finalEquityDelta.toFixed(0)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {result.record.rMultiple > 0 ? '+' : ''}{result.record.rMultiple.toFixed(2)}R
            {' · '}
            {t(candleCount === 1 ? 'resolution.candles' : 'resolution.candles_other', { n: candleCount })}
          </p>
        </div>
      )}

      {/* Trade details */}
      {!isSkip && (
        <div className="rounded-lg bg-slate-800/40 border border-slate-700 px-3 py-2.5 flex flex-col gap-1.5 text-xs">
          <DetailRow label={t('resolution.action')} value={actionLabel} valueColor={result.action === 'buy' ? 'text-emerald-400' : 'text-rose-400'} />
          <DetailRow label={t('resolution.entry')}  value={`$${result.entryPrice.toFixed(2)}`} valueColor="text-amber-400" />
          <DetailRow label={t('resolution.tp')}     value={`$${result.tpPrice.toFixed(2)}`}     valueColor="text-emerald-400" />
          <DetailRow label={t('resolution.sl')}     value={`$${result.slPrice.toFixed(2)}`}     valueColor="text-rose-400" />
          <div className="border-t border-slate-700 my-1" />
          <DetailRow label={t('resolution.distance')} value={`$${distance.toFixed(2)}`} />
          <DetailRow label={t('resolution.session')}  value={result.record.session.toUpperCase()} />
        </div>
      )}

      {/* Setup probability bars — shown immediately after TP/SL */}
      <div className={`rounded-lg border px-3 py-2.5 flex flex-col gap-2 ${
        setupHasSignal
          ? 'border-slate-600 bg-slate-800/40'
          : 'border-amber-700/60 bg-amber-900/10'
      }`}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest">{t('resolution.setupLabel')}</p>
          {setupGuess && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              guessedCorrectly
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {guessedCorrectly ? t('resolution.guessRight') : t('resolution.guessWrong')}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {SETUP_ORDER.map((type) => {
            const pct = (setupProbs[type] ?? 0) * 100
            const isActual = type === setupActual
            const isGuess  = type === setupGuess
            return (
              <SetupBar
                key={type}
                label={t(`setup.${type}`)}
                pct={pct}
                isActual={isActual}
                isGuess={isGuess}
                isInstinct={type === 'instinct'}
              />
            )
          })}
        </div>

        <p className={`text-[11px] leading-relaxed mt-0.5 ${setupHasSignal ? 'text-slate-400' : 'text-amber-500/80'}`}>
          {!setupHasSignal && '⚠ '}{reasonText}
        </p>
      </div>

      {!isSkip && (
        <div className="text-xs text-slate-400 px-1 leading-relaxed">{whyText}</div>
      )}

      <button
        onClick={onContinue}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-colors"
      >
        {t('resolution.continue')}
      </button>
    </motion.div>
  )
}

function DetailRow({ label, value, valueColor = 'text-white' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-medium ${valueColor}`}>{value}</span>
    </div>
  )
}

function SetupBar({ label, pct, isActual, isGuess, isInstinct }: {
  label: string; pct: number; isActual: boolean; isGuess: boolean; isInstinct: boolean
}) {
  const barColor = isActual
    ? (isInstinct ? 'bg-amber-500' : 'bg-emerald-500')
    : 'bg-slate-600'
  const labelColor = isActual
    ? (isInstinct ? 'text-amber-300' : 'text-emerald-300')
    : 'text-slate-400'

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="w-24 flex items-center gap-1 shrink-0">
        <span className={`${labelColor} ${isActual ? 'font-semibold' : ''} truncate`}>{label}</span>
        {isGuess && <span className="text-[9px] text-slate-500" title="Your guess">◀</span>}
      </div>
      <div className="flex-1 h-2 rounded-full bg-slate-900/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, pct)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full ${barColor}`}
        />
      </div>
      <span className={`font-mono w-9 text-right tabular-nums ${labelColor}`}>{pct.toFixed(0)}%</span>
    </div>
  )
}
