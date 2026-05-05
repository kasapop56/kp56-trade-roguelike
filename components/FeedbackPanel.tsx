'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { upsertFeedback, type FeedbackRow } from '@/lib/db'
import type { RunSummary } from '@/lib/archetypeEngine'

// ============ OPTION DEFINITIONS ============

const LIKED_OPTIONS = [
  { key: 'real_chart',   label: 'Reading real chart patterns' },
  { key: 'bias',         label: 'Bias prediction mechanic' },
  { key: 'trade_visual', label: 'Watching trade resolve on chart' },
  { key: 'win_rates',    label: 'Win rates backed by real backtest' },
  { key: 'roguelike',    label: 'The board / perks / roguelike feel' },
  { key: 'setup_types',  label: 'Setup classification (trend / counter / structure)' },
]

const CONFUSED_OPTIONS = [
  { key: 'bias_mechanic',  label: 'What bias prediction actually does' },
  { key: 'setup_types',    label: 'Setup types (with_trend / counter / structure / instinct)' },
  { key: 'win_rate_pct',   label: 'What the win rate % means' },
  { key: 'board',          label: 'How the dice / board works' },
  { key: 'buy_sell_skip',  label: 'When to BUY vs SELL vs SKIP' },
  { key: 'perk_system',    label: 'The perk system' },
  { key: 'scoring',        label: 'The scoring / equity system' },
]

const WANTED_OPTIONS = [
  { key: 'replay',       label: 'Replay mode — review every decision after the run' },
  { key: 'leaderboard',  label: 'Leaderboard / compare with other players' },
  { key: 'htf_context',  label: 'Higher timeframe context (H1 bias line)' },
  { key: 'indicators',   label: 'More indicators (EMA, VWAP)' },
  { key: 'tutorial',     label: 'Better in-game tutorial / hints' },
  { key: 'session_shade',label: 'Session shading on chart (Asia / London / NY)' },
  { key: 'more_perks',   label: 'More perks / variety' },
]

const EXPERIENCE_OPTIONS = [
  { key: 'beginner',    label: 'Complete beginner' },
  { key: 'learning',    label: 'Learning for < 1 year' },
  { key: 'trading_1_3', label: 'Trading 1–3 years' },
  { key: 'trading_3p',  label: 'Trading 3+ years' },
]

// ============ PROPS ============

export type FeedbackPanelProps = {
  userId: string
  runNumber: number
  isUpdate: boolean       // true = run 5 "want to update?" prompt
  summary: RunSummary
  existingFeedback?: Partial<FeedbackRow> | null
  onDone: () => void
  onSkip: () => void
}

// ============ STAR RATING ============

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`text-xl transition-colors ${
            value !== null && n <= value ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ============ MULTI-SELECT ============

function MultiSelect({
  options, selected, max, onChange,
}: {
  options: { key: string; label: string }[]
  selected: string[]
  max: number
  onChange: (keys: string[]) => void
}) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key))
    } else if (selected.length < max) {
      onChange([...selected, key])
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      {options.map(opt => {
        const active = selected.includes(opt.key)
        const disabled = !active && selected.length >= max
        return (
          <button
            key={opt.key}
            onClick={() => !disabled && toggle(opt.key)}
            className={[
              'text-left px-3 py-2 rounded-lg border text-sm transition-colors',
              active
                ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                : disabled
                  ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500',
            ].join(' ')}
          >
            {active ? '✓ ' : ''}{opt.label}
          </button>
        )
      })}
      <p className="text-[10px] text-slate-600 text-right">Pick up to {max}</p>
    </div>
  )
}

// ============ MAIN ============

type Section = 'ratings' | 'liked' | 'confused' | 'wrong' | 'wanted' | 'experience' | 'extra'

const SECTIONS: Section[] = ['ratings', 'liked', 'confused', 'wrong', 'wanted', 'experience', 'extra']

const SECTION_TITLES: Record<Section, string> = {
  ratings:    'How was this run?',
  liked:      'What did you like most?',
  confused:   'What confused you most?',
  wrong:      'What felt wrong or incorrect?',
  wanted:     'What would you add next?',
  experience: 'Your trading background',
  extra:      'Anything else?',
}

export default function FeedbackPanel({
  userId, runNumber, isUpdate, summary, existingFeedback, onDone, onSkip,
}: FeedbackPanelProps) {
  const pre = existingFeedback ?? {}

  const [sectionIdx, setSectionIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [funRating,        setFunRating]        = useState<number | null>(pre.fun_rating ?? null)
  const [learnRating,      setLearnRating]       = useState<number | null>(pre.learn_rating ?? null)
  const [difficultyRating, setDifficultyRating]  = useState<number | null>(pre.difficulty_rating ?? null)
  const [liked,            setLiked]             = useState<string[]>(pre.liked_features ?? [])
  const [confused,         setConfused]          = useState<string[]>(pre.confused_features ?? [])
  const [feltWrong,        setFeltWrong]         = useState(pre.felt_wrong ?? '')
  const [wanted,           setWanted]            = useState<string[]>(pre.wanted_features ?? [])
  const [experience,       setExperience]        = useState(pre.trading_experience ?? '')
  const [extra,            setExtra]             = useState(pre.general_comment ?? '')

  const section  = SECTIONS[sectionIdx]
  const isLast   = sectionIdx === SECTIONS.length - 1
  const progress = ((sectionIdx + 1) / SECTIONS.length) * 100

  async function handleSubmit() {
    setSubmitting(true)
    await upsertFeedback({
      user_id:            userId,
      submitted_at_run:   runNumber,
      fun_rating:         funRating,
      learn_rating:       learnRating,
      difficulty_rating:  difficultyRating,
      liked_features:     liked,
      confused_features:  confused,
      wanted_features:    wanted,
      felt_wrong:         feltWrong,
      feature_request:    '',
      general_comment:    extra,
      trading_experience: experience,
      run_archetype:      summary.archetype,
      run_equity_final:   summary.finalEquity,
      run_bias_accuracy:  summary.biasAccuracy,
    })
    setSubmitting(false)
    onDone()
  }

  // If isUpdate, show a gate asking if they want to update first
  const [updateConfirmed, setUpdateConfirmed] = useState(!isUpdate)
  if (!updateConfirmed) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4"
        >
          <div className="text-center">
            <p className="text-2xl mb-2">🎉</p>
            <h3 className="text-white font-bold">5 runs completed!</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              You&apos;ve played 5 times. Want to update your feedback now that you know the game better?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400
                         hover:border-slate-400 text-sm font-medium transition-colors"
            >
              Skip
            </button>
            <motion.button
              onClick={() => setUpdateConfirmed(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400
                         text-slate-900 font-bold text-sm transition-colors"
            >
              Update feedback →
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest">
              Feedback · {sectionIdx + 1}/{SECTIONS.length}
            </p>
            <button onClick={onSkip} className="text-xs text-slate-600 hover:text-slate-400">
              Skip all
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Section content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="px-5 pb-3 flex flex-col gap-3"
          >
            <h3 className="text-white font-semibold text-base">{SECTION_TITLES[section]}</h3>

            {section === 'ratings' && (
              <div className="flex flex-col gap-3">
                {([
                  ['Fun / enjoyment',         funRating,        setFunRating],
                  ['Learning value',          learnRating,      setLearnRating],
                  ['Difficulty (1=easy)',     difficultyRating, setDifficultyRating],
                ] as [string, number | null, (v: number) => void][]).map(([label, val, set]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-300 shrink-0">{label}</p>
                    <StarRating value={val} onChange={set} />
                  </div>
                ))}
              </div>
            )}

            {section === 'liked' && (
              <MultiSelect options={LIKED_OPTIONS} selected={liked} max={3} onChange={setLiked} />
            )}

            {section === 'confused' && (
              <MultiSelect options={CONFUSED_OPTIONS} selected={confused} max={3} onChange={setConfused} />
            )}

            {section === 'wrong' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  e.g. win rates seemed off, chart didn&apos;t show enough context, a rule felt wrong
                </p>
                <textarea
                  value={feltWrong}
                  onChange={e => setFeltWrong(e.target.value)}
                  placeholder="Optional — leave blank if nothing seemed wrong"
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5
                             text-sm text-white placeholder-slate-600 resize-none
                             focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            )}

            {section === 'wanted' && (
              <MultiSelect options={WANTED_OPTIONS} selected={wanted} max={3} onChange={setWanted} />
            )}

            {section === 'experience' && (
              <div className="flex flex-col gap-2">
                {EXPERIENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setExperience(opt.key)}
                    className={[
                      'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                      experience === opt.key
                        ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500',
                    ].join(' ')}
                  >
                    {experience === opt.key ? '✓ ' : ''}{opt.label}
                  </button>
                ))}
              </div>
            )}

            {section === 'extra' && (
              <textarea
                value={extra}
                onChange={e => setExtra(e.target.value)}
                placeholder="Any other thoughts, bugs, or ideas…"
                rows={5}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5
                           text-sm text-white placeholder-slate-600 resize-none
                           focus:outline-none focus:border-amber-500 transition-colors"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="px-5 pb-5 flex gap-2 mt-1">
          {sectionIdx > 0 && (
            <button
              onClick={() => setSectionIdx(i => i - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-400
                         hover:border-slate-400 text-sm font-medium transition-colors"
            >
              ←
            </button>
          )}
          {!isLast && (
            <motion.button
              onClick={() => setSectionIdx(i => i + 1)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600
                         text-white font-bold text-sm transition-colors"
            >
              Next →
            </motion.button>
          )}
          {isLast && (
            <motion.button
              onClick={handleSubmit}
              disabled={submitting}
              whileHover={!submitting ? { scale: 1.02 } : {}}
              whileTap={!submitting ? { scale: 0.98 } : {}}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400
                         text-slate-900 font-bold text-sm transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Submit feedback ✓'}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
