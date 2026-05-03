'use client'

import { motion } from 'framer-motion'
import type { PerkType } from '@/store/gameStore'

export type WisdomPanelProps = {
  choices: PerkType[]
  activePerk: PerkType | null
  onSelect: (perk: PerkType) => void
}

export const PERK_META: Record<PerkType, { name: string; desc: string; tradeoff: string; icon: string }> = {
  iron_will:     { name: 'Iron Will',     icon: '🛡', desc: 'Next loss reduced 25% extra', tradeoff: 'No effect on wins' },
  sniper:        { name: 'Sniper',        icon: '🎯', desc: 'Next win gives +0.5R bonus',  tradeoff: 'One-shot only' },
  extra_skip:    { name: 'Extra Time',    icon: '⏸', desc: 'Gain 1 free skip this run',   tradeoff: 'No combat bonus' },
  bull_vision:   { name: 'Bull Vision',   icon: '👁', desc: 'Count 1 free bias correct',   tradeoff: 'Skips the Q1 phase' },
  second_chance: { name: 'Second Chance', icon: '🎲', desc: 'Reroll dice once this run',   tradeoff: 'One-shot only' },
}

export default function WisdomPanel({ choices, activePerk, onSelect }: WisdomPanelProps) {
  if (activePerk) {
    const meta = PERK_META[activePerk]
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-400 uppercase tracking-widest">Active Perk</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-900/30 border border-violet-700">
          <span className="text-lg">{meta.icon}</span>
          <div>
            <p className="text-sm font-medium text-violet-200">{meta.name}</p>
            <p className="text-xs text-slate-400">{meta.desc}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest">Wisdom Square — Choose a Perk</p>
      <div className="flex flex-col gap-2">
        {choices.map((perk, i) => {
          const meta = PERK_META[perk]
          return (
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
              <span className="text-xl mt-0.5">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{meta.name}</p>
                <p className="text-xs text-slate-400">{meta.desc}</p>
                <p className="text-xs text-slate-600 mt-0.5">Trade-off: {meta.tradeoff}</p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
