'use client'

import { motion } from 'framer-motion'
import type { RunSummary } from '@/lib/archetypeEngine'
import { useT } from '@/lib/useT'

export type ScorecardProps = {
  summary: RunSummary
  onNewRun: () => void
}

export default function Scorecard({ summary, onNewRun }: ScorecardProps) {
  const { t } = useT()
  const roiColor = summary.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
  const roiSign  = summary.roi >= 0 ? '+' : ''

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-[#13131f] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t('sc.complete')}</p>
          <h2 className="text-2xl font-bold text-white">{t(`archetype.${summary.archetype}`)}</h2>
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{t('sc.finalEquity')}</p>
            <p className="text-2xl font-mono font-bold text-white">${summary.finalEquity.toFixed(0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">{t('sc.roi')}</p>
            <p className={`text-2xl font-mono font-bold ${roiColor}`}>
              {roiSign}{(summary.roi * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b border-slate-800">
          <StatCell label={t('sc.trades')} value={summary.totalTrades} />
          <StatCell label={t('sc.wins')}   value={summary.wins}   color="text-emerald-400" />
          <StatCell label={t('sc.losses')} value={summary.losses} color="text-rose-400" />
          <StatCell label={t('sc.skips')}  value={summary.skips}  color="text-slate-400" />
        </div>

        <div className="px-6 py-4 flex gap-4 border-b border-slate-800">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">{t('sc.winrate')}</p>
            <WinrateBar wins={summary.wins} total={summary.totalTrades} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">{t('sc.biasAccuracy')}</p>
            <WinrateBar wins={Math.round(summary.biasAccuracy * 10)} total={10} color="bg-violet-500" />
          </div>
        </div>

        {summary.rMultiples.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="text-xs text-slate-500 mb-2">{t('sc.rDist')}</p>
            <RHistogram rMultiples={summary.rMultiples} />
          </div>
        )}

        {summary.diagnosis.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="text-xs text-slate-500 mb-2">{t('sc.diagnosis')}</p>
            <ul className="flex flex-col gap-1.5">
              {summary.diagnosis.map((line, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-slate-600 shrink-0">›</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-6 py-4">
          <motion.button
            onClick={onNewRun}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base transition-colors"
          >
            {t('sc.newRun')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ============ SUB-COMPONENTS ============

function StatCell({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function WinrateBar({ wins, total, color = 'bg-emerald-500' }: { wins: number; total: number; color?: string }) {
  const pct = total > 0 ? (wins / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-mono text-slate-300 w-8 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

function RHistogram({ rMultiples }: { rMultiples: number[] }) {
  // Buckets: <-1, -1, -0.5, 0, +0.5, +1, >+1
  const buckets = [
    { label: '<-1', min: -Infinity, max: -1 },
    { label: '-1',  min: -1,        max: -0.6 },
    { label: '-½',  min: -0.6,      max: -0.1 },
    { label: '+½',  min: -0.1,      max: 0.6 },
    { label: '+1',  min: 0.6,       max: 1.4 },
    { label: '>+1', min: 1.4,       max: Infinity },
  ]
  const counts = buckets.map(b => rMultiples.filter(r => r > b.min && r <= b.max).length)
  const maxCount = Math.max(...counts, 1)

  return (
    <div className="flex items-end gap-1 h-10">
      {buckets.map((b, i) => {
        const height = (counts[i] / maxCount) * 100
        const isPositive = b.min >= -0.1
        return (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-0.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className={`w-full rounded-t ${isPositive ? 'bg-emerald-600' : 'bg-rose-700'}`}
              style={{ minHeight: counts[i] > 0 ? 4 : 0 }}
            />
            <span className="text-[9px] text-slate-600">{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}
