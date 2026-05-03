'use client'

import { motion } from 'framer-motion'
import type { PendingTrade } from '@/store/gameStore'

export type TradeResolutionProps = {
  pending: PendingTrade
  biasWasCorrect: boolean
  onContinue: () => void
}

export default function TradeResolution({ pending, biasWasCorrect, onContinue }: TradeResolutionProps) {
  const { result, finalEquityDelta } = pending
  const isWin     = result.outcome === 'win'
  const candleCount = result.exitCandleIndex - result.entryCandleIndex
  const action   = result.action.toUpperCase()
  const distance = Math.abs(result.entryPrice - (isWin ? result.tpPrice : result.slPrice))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
    >
      {/* Result header */}
      <div className={`rounded-xl border-2 px-4 py-3 ${isWin ? 'border-emerald-600 bg-emerald-900/20' : 'border-rose-700 bg-rose-900/20'}`}>
        <div className="flex items-center justify-between mb-1">
          <p className={`text-sm font-bold uppercase tracking-widest ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isWin ? '✓ Take Profit Hit' : '✗ Stop Loss Hit'}
          </p>
          <span className={`text-lg font-mono font-bold ${isWin ? 'text-emerald-300' : 'text-rose-300'}`}>
            {finalEquityDelta >= 0 ? '+' : ''}${finalEquityDelta.toFixed(0)}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {result.record.rMultiple > 0 ? '+' : ''}{result.record.rMultiple.toFixed(2)}R
          {' · '}
          {candleCount} {candleCount === 1 ? 'candle' : 'candles'} to resolution
        </p>
      </div>

      {/* Trade detail rows */}
      <div className="rounded-lg bg-slate-800/40 border border-slate-700 px-3 py-2.5 flex flex-col gap-1.5 text-xs">
        <DetailRow label="Action" value={action} valueColor={action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'} />
        <DetailRow label="Entry"  value={`$${result.entryPrice.toFixed(2)}`} valueColor="text-amber-400" />
        <DetailRow label="Take Profit" value={`$${result.tpPrice.toFixed(2)}`} valueColor="text-emerald-400" />
        <DetailRow label="Stop Loss"   value={`$${result.slPrice.toFixed(2)}`} valueColor="text-rose-400" />
        <div className="border-t border-slate-700 my-1" />
        <DetailRow label="Distance" value={`$${distance.toFixed(2)}`} />
        <DetailRow label="Setup"    value={result.record.setupActual} valueColor="text-slate-300 capitalize" />
        <DetailRow label="Session"  value={result.record.session.toUpperCase()} />
      </div>

      {/* Why explanation */}
      <div className="text-xs text-slate-400 px-1 leading-relaxed">
        {isWin
          ? `Price moved ${action === 'BUY' ? 'up' : 'down'} to your Take Profit before retracing. You earned 1R.`
          : biasWasCorrect
            ? `Price moved against you and hit Stop Loss. Your correct bias guess softened the blow by 50%.`
            : `Price moved against you and hit Stop Loss. You lost 1R.`}
      </div>

      <button
        onClick={onContinue}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-colors"
      >
        Continue
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
