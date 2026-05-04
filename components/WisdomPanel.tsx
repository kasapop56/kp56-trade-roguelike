'use client'

import { motion } from 'framer-motion'
import type { PerkType } from '@/store/gameStore'
import { useT } from '@/lib/useT'

export type WisdomPanelProps = {
  choices: PerkType[]
  activePerk: PerkType | null
  onSelect: (perk: PerkType) => void
}

const PERK_ICONS: Record<PerkType, string> = {
  iron_will:     '🛡',
  sniper:        '🎯',
  extra_skip:    '⏸',
  bull_vision:   '👁',
  second_chance: '🎲',
}

export default function WisdomPanel({ choices, activePerk, onSelect }: WisdomPanelProps) {
  const { t } = useT()

  if (activePerk) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-400 uppercase tracking-widest">{t('wisdom.active')}</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-900/30 border border-violet-700">
          <span className="text-lg">{PERK_ICONS[activePerk]}</span>
          <div>
            <p className="text-sm font-medium text-violet-200">{t(`perk.${activePerk}`)}</p>
            <p className="text-xs text-slate-400">{t(`perk.${activePerk}Desc`)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest">{t('wisdom.choose')}</p>
      <div className="flex flex-col gap-2">
        {choices.map((perk, i) => (
          <motion.button
            key={perk}
            onClick={() => onSelect(perk)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800/40 hover:border-violet-600 hover:bg-violet-900/20 transition-all cursor-pointer text-left"
          >
            <span className="text-xl mt-0.5">{PERK_ICONS[perk]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{t(`perk.${perk}`)}</p>
              <p className="text-xs text-slate-400">{t(`perk.${perk}Desc`)}</p>
              <p className="text-xs text-slate-600 mt-0.5">{t('wisdom.tradeoff', { text: t(`perk.${perk}Tradeoff`) })}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
