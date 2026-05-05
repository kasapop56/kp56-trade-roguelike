'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import Chart from '@/components/Chart'
import Board from '@/components/Board'
import Dice from '@/components/Dice'
import BiasPanel from '@/components/BiasPanel'
import TradePanel from '@/components/TradePanel'
import Scorecard from '@/components/Scorecard'
import WisdomPanel from '@/components/WisdomPanel'
import TradeResolution from '@/components/TradeResolution'
import WaitingRoom from '@/components/WaitingRoom'
import IntroModal from '@/components/IntroModal'
import FeedbackPanel from '@/components/FeedbackPanel'
import type { ChartProps } from '@/components/Chart'
import type { TradeAction, SetupType, MysteryOutcome, PerkType } from '@/store/gameStore'
import { useT } from '@/lib/useT'
import type { Language } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import {
  ensureProfile, markIntroSeen, incrementRunCount,
  getActiveCount, startSession, pingSession, endSession,
  saveGameRun, getFeedback,
  type Profile, type FeedbackRow,
} from '@/lib/db'
import type { User } from '@supabase/supabase-js'
import type { RunSummary } from '@/lib/archetypeEngine'

const MAX_PLAYERS = 20

const PERK_ICON: Record<PerkType, string> = {
  iron_will: '🛡', sniper: '🎯', extra_skip: '⏸', bull_vision: '👁', second_chance: '🎲',
}

export default function GamePage() {
  const router = useRouter()
  const {
    run, stats, lastRunSummary,
    startRun, setBiasGuess, rollDice, selectLandingSquare,
    selectPerk, dismissMysteryOutcome, decideTrade, confirmTradeResult, endRun, dismissScorecard,
    setLanguage,
  } = useGameStore()
  const language = useGameStore(s => s.settings.language)
  const { t } = useT()
  const [starting, setStarting] = useState(false)

  // ── Auth / profile state ──────────────────────────────────────────────────
  const [user,        setUser]        = useState<User | null>(null)
  const [profile,     setProfile]     = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── Capacity state ────────────────────────────────────────────────────────
  const [atCapacity,   setAtCapacity]   = useState(false)
  const [activeCount,  setActiveCount]  = useState(0)

  // ── Overlay state ─────────────────────────────────────────────────────────
  const [showIntro,        setShowIntro]        = useState(false)
  const [showFeedback,     setShowFeedback]      = useState(false)
  const [feedbackIsUpdate, setFeedbackIsUpdate]  = useState(false)
  const [existingFeedback, setExistingFeedback]  = useState<FeedbackRow | null>(null)
  const [currentRunNumber, setCurrentRunNumber]  = useState(0)

  // ── Auth check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const sb = createClient()
      const { data: { user: u } } = await sb.auth.getUser()
      if (!u) {
        router.push('/login')
        return
      }
      setUser(u)
      const p = await ensureProfile(u.id)
      setProfile(p)
      if (!p.intro_seen) setShowIntro(true)
      setAuthLoading(false)
    }
    checkAuth()
  }, [router])

  // ── Session heartbeat while game is running ────────────────────────────────
  useEffect(() => {
    if (!run || !user) return
    const id = setInterval(() => pingSession(user.id), 60_000)
    return () => clearInterval(id)
  }, [run, user])

  // ── Save run + check feedback when scorecard appears ──────────────────────
  const savedRunRef = useRef<string | null>(null)  // prevent double-save
  useEffect(() => {
    if (!lastRunSummary || !user || !profile) return
    const key = `${user.id}-${lastRunSummary.finalEquity}-${lastRunSummary.biasAccuracy}`
    if (savedRunRef.current === key) return
    savedRunRef.current = key

    async function persist() {
      const newRunNumber = await incrementRunCount(user!.id)
      setCurrentRunNumber(newRunNumber)
      await saveGameRun(user!.id, lastRunSummary as RunSummary, newRunNumber)
      await endSession(user!.id)

      // Feedback logic: show on run 1, prompt to update on run 5
      if (newRunNumber === 1) {
        setFeedbackIsUpdate(false)
        setExistingFeedback(null)
        setShowFeedback(true)
      } else if (newRunNumber === 5) {
        const existing = await getFeedback(user!.id)
        setExistingFeedback(existing)
        setFeedbackIsUpdate(true)
        setShowFeedback(true)
      }

      setProfile(p => p ? { ...p, run_count: newRunNumber } : p)
    }
    persist()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRunSummary])

  // ── Bias streak ───────────────────────────────────────────────────────────
  const streak = run
    ? [...run.biasHistory].reverse().findIndex(b => !b.correct)
    : 0
  const biasStreak = streak === -1
    ? (run?.biasHistory.filter(b => b.correct).length ?? 0)
    : streak

  const lastBias = run?.biasHistory.at(-1)
  const lastBiasResult: 'correct' | 'wrong' | null = lastBias
    ? (lastBias.correct ? 'correct' : 'wrong')
    : null
  const biasDamageReduction = !!lastBias?.correct

  // ── Bias flash ────────────────────────────────────────────────────────────
  type BiasFlash = { guess: 'up' | 'down'; actual: 'up' | 'down'; correct: boolean }
  const [biasFlash, setBiasFlash] = useState<BiasFlash | null>(null)
  const prevBiasLen = useRef(0)
  useEffect(() => {
    const len = run?.biasHistory.length ?? 0
    if (len > prevBiasLen.current && run?.biasHistory.at(-1)) {
      const entry = run!.biasHistory.at(-1)!
      setBiasFlash({ guess: entry.guess, actual: entry.actual, correct: entry.correct })
      const id = setTimeout(() => setBiasFlash(null), 2500)
      prevBiasLen.current = len
      return () => clearTimeout(id)
    }
    prevBiasLen.current = len
  }, [run?.biasHistory.length])

  // ── Start game ────────────────────────────────────────────────────────────
  async function handleStart() {
    if (!user) return
    setStarting(true)

    // Capacity check
    const count = await getActiveCount()
    if (count >= MAX_PLAYERS) {
      setActiveCount(count)
      setAtCapacity(true)
      setStarting(false)
      return
    }

    await startSession(user.id)
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    await startRun(seed)
    setAtCapacity(false)
    setStarting(false)
  }

  const handleRetryCapacity = useCallback(async () => {
    if (!user) return
    const count = await getActiveCount()
    if (count < MAX_PLAYERS) {
      setAtCapacity(false)
      await handleStart()
    } else {
      setActiveCount(count)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleTradeAction = useCallback(
    (action: TradeAction, setupGuess: SetupType | null) => decideTrade(action, setupGuess),
    [decideTrade],
  )

  const previewSquares = (run?.previewableSquares ?? []).map(idx => ({
    index: idx,
    type: run!.squares[idx].type,
  }))

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  // ── Capacity full ─────────────────────────────────────────────────────────
  if (atCapacity) {
    return <WaitingRoom onRetry={handleRetryCapacity} />
  }

  // ── Scorecard overlay ─────────────────────────────────────────────────────
  if (lastRunSummary) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] relative">
        <div className="absolute top-3 right-3 z-[60]">
          <LanguageToggle current={language} onChange={setLanguage} />
        </div>
        <Scorecard
          summary={lastRunSummary}
          onNewRun={() => { dismissScorecard(); handleStart() }}
        />
        {showFeedback && user && (
          <FeedbackPanel
            userId={user.id}
            runNumber={currentRunNumber}
            isUpdate={feedbackIsUpdate}
            summary={lastRunSummary as RunSummary}
            existingFeedback={existingFeedback}
            onDone={() => setShowFeedback(false)}
            onSkip={() => setShowFeedback(false)}
          />
        )}
      </div>
    )
  }

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!run) {
    return (
      <>
        <StartScreen
          onStart={handleStart}
          starting={starting}
          stats={stats}
          language={language}
          onChangeLanguage={setLanguage}
          userEmail={user?.email}
          onProfile={() => router.push('/profile')}
          onHelp={() => setShowIntro(true)}
        />
        {showIntro && (
          <IntroModal
            language={language}
            onDone={async () => {
              setShowIntro(false)
              if (user) await markIntroSeen(user.id)
            }}
          />
        )}
      </>
    )
  }

  const isRunOver = run.currentSquareIndex >= run.squares.length - 1

  const tradeOverlay: ChartProps['tradeOverlay'] = run.pendingTrade && run.pendingTrade.result.action !== 'skip'
    ? {
        action: run.pendingTrade.result.action as 'buy' | 'sell',
        entryPrice: run.pendingTrade.result.entryPrice,
        slPrice: run.pendingTrade.result.slPrice,
        tpPrice: run.pendingTrade.result.tpPrice,
        entryCandleIndex: run.pendingTrade.result.entryCandleIndex,
        exitCandleIndex: run.pendingTrade.result.exitCandleIndex,
        outcome: run.pendingTrade.result.outcome === 'skip' ? 'loss' : run.pendingTrade.result.outcome,
        resolved: run.revealedCandleIndex > run.pendingTrade.result.exitCandleIndex,
      }
    : null

  const pastTrades: ChartProps['pastTrades'] = run.trades
    .filter(t => t.action !== 'skip' && t.outcome !== 'skip')
    .map(t => ({
      action: t.action as 'buy' | 'sell',
      entryCandleIndex: t.entryCandleIndex,
      exitCandleIndex: t.exitCandleIndex,
      outcome: t.outcome as 'win' | 'loss',
    }))

  const showResolution = !!run.pendingTrade
  const showWisdom     = !!run.pendingWisdomChoices && !showResolution
  const showMystery    = !!run.pendingMysteryOutcome && !showResolution
  const showTrade      = run.awaitingTradeDecision && !showResolution
  const showDice       = !showTrade && !showWisdom && !showMystery && !showResolution && !isRunOver
  const showBias       = showDice && run.diceValue === null

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-bold tracking-tight">{t('app.title')}</span>
          <span className="text-xs text-slate-500 hidden sm:inline">{t('app.subtitle')}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            {t('app.equity')} <span className="text-white font-mono">${run.equity.toFixed(0)}</span>
          </span>
          <span className="text-slate-400">
            {t('app.square')} <span className="text-white">{Math.max(0, run.currentSquareIndex + 1)}/30</span>
          </span>
          <button
            onClick={() => setShowIntro(true)}
            title={language === 'th' ? 'คู่มือ' : 'Help'}
            className="w-6 h-6 rounded-full border border-slate-600 text-slate-400
                       hover:border-slate-400 hover:text-white text-xs font-bold
                       flex items-center justify-center transition-colors"
          >
            ?
          </button>
          <LanguageToggle current={language} onChange={setLanguage} />
        </div>
      </header>

      {showIntro && (
        <IntroModal
          language={language}
          onDone={() => setShowIntro(false)}
        />
      )}

      {/* Main: chart + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart */}
        <div className="flex-1 p-3 min-h-0">
          <Chart
            candles={run.candles}
            revealedCount={run.revealedCandleIndex}
            warmupCount={120}
            animating={run.awaitingTradeDecision || !!run.pendingTrade}
            animationSpeedMs={run.pendingTrade ? 180 : 300}
            tradeOverlay={tradeOverlay}
            pastTrades={pastTrades}
            biasRefPrice={run.biasRefPrice}
            className="h-full"
          />
        </div>

        {/* Sidebar */}
        <aside className="w-72 flex flex-col border-l border-slate-800 overflow-y-auto shrink-0">
          <div className="relative p-3 border-b border-slate-800">
            <Board
              squares={run.squares}
              currentIndex={run.currentSquareIndex}
              previewableIndices={run.previewableSquares}
              onSquareClick={selectLandingSquare}
            />
          </div>

          {run.activePerk && !showResolution && !showWisdom && (
            <ActivePerkBadge perk={run.activePerk} />
          )}

          <AnimatePresence>
            {biasFlash && (
              <motion.div
                key="bias-flash"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`mx-3 mb-0 px-4 py-3 rounded-xl border-2 text-center ${
                  biasFlash.correct
                    ? 'border-emerald-500 bg-emerald-900/40'
                    : 'border-slate-600 bg-slate-800/60'
                }`}
              >
                <p className="text-2xl mb-1">{biasFlash.correct ? '✓' : '✗'}</p>
                <p className={`text-base font-bold ${biasFlash.correct ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {t(biasFlash.correct ? 'biasflash.correct' : 'biasflash.wrong')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {t('biasflash.guessed')} <span className={biasFlash.guess === 'up' ? 'text-green-400' : 'text-red-400'}>
                    {t(biasFlash.guess === 'up' ? 'bias.up' : 'bias.down')}
                  </span>
                  {' · '}{t('biasflash.actual')} <span className={biasFlash.actual === 'up' ? 'text-green-400' : 'text-red-400'}>
                    {t(biasFlash.actual === 'up' ? 'bias.up' : 'bias.down')}
                  </span>
                </p>
                {biasFlash.correct && (
                  <p className="text-xs text-emerald-500 mt-1 font-medium">🛡 {t('biasflash.shield')}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-4 p-4">
            <AnimatePresence mode="wait">
              {showResolution && run.pendingTrade && (
                <TradeResolution
                  key="resolution"
                  pending={run.pendingTrade}
                  biasWasCorrect={!!lastBias?.correct}
                  onContinue={confirmTradeResult}
                />
              )}
              {showWisdom && (
                <motion.div key="wisdom" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <WisdomPanel choices={run.pendingWisdomChoices!} activePerk={run.activePerk} onSelect={selectPerk} />
                </motion.div>
              )}
              {showMystery && (
                <motion.div key="mystery" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <MysteryResult outcome={run.pendingMysteryOutcome!} onDismiss={dismissMysteryOutcome} />
                </motion.div>
              )}
              {showTrade && (
                <motion.div key="trade" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TradePanel
                    equity={run.equity}
                    riskAmount={run.equity * 0.1}
                    biasDamageReduction={biasDamageReduction}
                    onAction={handleTradeAction}
                  />
                </motion.div>
              )}
              {showDice && (
                <motion.div key="dice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                  {showBias && (
                    <BiasPanel
                      pending={run.pendingBiasGuess}
                      streak={biasStreak}
                      lastResult={lastBiasResult}
                      disabled={false}
                      onGuess={setBiasGuess}
                    />
                  )}
                  <Dice
                    value={run.diceValue}
                    previewableSquares={previewSquares}
                    disabled={run.pendingBiasGuess === null && run.diceValue === null}
                    onRoll={rollDice}
                    onSelectSquare={selectLandingSquare}
                  />
                </motion.div>
              )}
              {isRunOver && (
                <motion.div key="end" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
                  <p className="text-lg font-bold text-yellow-400 mb-2">{t('over.title')}</p>
                  <p className="text-sm text-slate-400 mb-4">
                    {t('over.finalEquity')} <span className="text-white font-mono">${run.equity.toFixed(0)}</span>
                  </p>
                  <button
                    onClick={endRun}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
                  >
                    {t('over.viewScorecard')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─── Sub-components (unchanged) ─────────────────────────────────────────────

function MysteryResult({ outcome, onDismiss }: { outcome: MysteryOutcome | null; onDismiss: () => void }) {
  const { t } = useT()
  if (!outcome) return null
  const isGain = outcome.direction === 'gain'
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest">{t('mystery.title')}</p>
      <div className={`rounded-xl border-2 p-4 text-center ${isGain ? 'border-teal-600 bg-teal-900/20' : 'border-rose-700 bg-rose-900/20'}`}>
        <p className="text-3xl mb-2">{isGain ? '🎉' : '💀'}</p>
        <p className={`text-xl font-bold font-mono ${isGain ? 'text-teal-300' : 'text-rose-400'}`}>
          {isGain ? '+' : '-'}{outcome.rMultiple}R
        </p>
        <p className="text-sm text-slate-400 mt-1">{t(isGain ? 'mystery.lucky' : 'mystery.unlucky')}</p>
      </div>
      <button onClick={onDismiss} className="w-full py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-sm transition-colors">
        {t('mystery.continue')}
      </button>
    </div>
  )
}

function ActivePerkBadge({ perk }: { perk: PerkType }) {
  const { t } = useT()
  return (
    <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-violet-900/25 border border-violet-700/60 flex items-center gap-2">
      <span className="text-base">{PERK_ICON[perk]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-violet-400 uppercase tracking-widest leading-none">{t('wisdom.active')}</p>
        <p className="text-sm text-violet-100 font-medium truncate">{t(`perk.${perk}`)}</p>
      </div>
    </div>
  )
}

function LanguageToggle({ current, onChange }: { current: Language; onChange: (lang: Language) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-slate-800/60 border border-slate-700 p-0.5 text-xs">
      <button onClick={() => onChange('th')} className={`px-2 py-0.5 rounded transition-colors ${current === 'th' ? 'bg-amber-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'}`}>TH</button>
      <button onClick={() => onChange('en')} className={`px-2 py-0.5 rounded transition-colors ${current === 'en' ? 'bg-amber-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'}`}>EN</button>
    </div>
  )
}

function StartScreen({
  onStart, starting, stats, language, onChangeLanguage, userEmail, onProfile, onHelp,
}: {
  onStart: () => void
  starting: boolean
  stats: { totalRuns: number; avgBiasAccuracy: number }
  language: Language
  onChangeLanguage: (lang: Language) => void
  userEmail?: string
  onProfile: () => void
  onHelp: () => void
}) {
  const { t } = useT()
  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center gap-8 px-4 relative">
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          onClick={onHelp}
          title={language === 'th' ? 'คู่มือ' : 'Help'}
          className="w-6 h-6 rounded-full border border-slate-600 text-slate-400
                     hover:border-slate-400 hover:text-white text-xs font-bold
                     flex items-center justify-center transition-colors"
        >
          ?
        </button>
        <LanguageToggle current={language} onChange={onChangeLanguage} />
      </div>
      {userEmail && (
        <div className="absolute top-3 left-3">
          <button
            onClick={onProfile}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <span className="text-slate-600">👤</span> {userEmail}
          </button>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-400 tracking-tight mb-2">{t('app.title')}</h1>
        <p className="text-slate-400 text-lg">{t('start.tagline')}</p>
        <p className="text-xs text-slate-600 mt-1">Beta · Real XAUUSD M5 Data</p>
      </div>

      {stats.totalRuns > 0 && (
        <div className="flex gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{stats.totalRuns}</p>
            <p className="text-slate-500 text-sm">{t('start.runs')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{(stats.avgBiasAccuracy * 100).toFixed(0)}%</p>
            <p className="text-slate-500 text-sm">{t('start.biasAccuracy')}</p>
          </div>
        </div>
      )}

      <motion.button
        onClick={onStart}
        disabled={starting}
        whileHover={!starting ? { scale: 1.04 } : {}}
        whileTap={!starting ? { scale: 0.96 } : {}}
        className="px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold text-lg transition-colors shadow-lg shadow-amber-500/20"
      >
        {starting ? t('start.loading') : stats.totalRuns > 0 ? t('start.next') : t('start.first')}
      </motion.button>

      <p className="text-xs text-slate-600 max-w-xs text-center">{t('app.disclaimer')}</p>
    </div>
  )
}
