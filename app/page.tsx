'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import Chart from '@/components/Chart'
import Board from '@/components/Board'
import Dice from '@/components/Dice'
import BiasPanel from '@/components/BiasPanel'
import TradePanel from '@/components/TradePanel'
import type { TradeAction, SetupType } from '@/store/gameStore'

// ============ COMPONENT ============

export default function GamePage() {
  const { run, stats, startRun, setBiasGuess, rollDice, selectLandingSquare, decideTrade, endRun } = useGameStore()
  const [starting, setStarting] = useState(false)

  // Derive bias streak from history
  const streak = run
    ? [...run.biasHistory].reverse().findIndex((b) => !b.correct)
    : 0
  const biasStreak = streak === -1 ? run?.biasHistory.filter((b) => b.correct).length ?? 0 : streak

  // Last bias result
  const lastBias = run?.biasHistory.at(-1)
  const lastBiasResult: 'correct' | 'wrong' | null = lastBias ? (lastBias.correct ? 'correct' : 'wrong') : null

  // Bias damage reduction active if last bias was correct
  const biasDamageReduction = !!lastBias?.correct

  async function handleStart() {
    setStarting(true)
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    await startRun(seed)
    setStarting(false)
  }

  const handleTradeAction = useCallback(
    (action: TradeAction, setupGuess: SetupType | null) => {
      decideTrade(action, setupGuess)
    },
    [decideTrade],
  )

  // Variant C: build previewable squares with type info
  const previewSquares = (run?.previewableSquares ?? []).map((idx) => ({
    index: idx,
    type: run!.squares[idx].type,
  }))

  // ============ SCREENS ============

  if (!run) {
    return <StartScreen onStart={handleStart} starting={starting} stats={stats} />
  }

  const isRunOver = run.currentSquareIndex >= run.squares.length - 1

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-bold tracking-tight">TRADE ROGUELIKE</span>
          <span className="text-xs text-slate-500 hidden sm:inline">M5 · XAUUSD</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            Equity <span className="text-white font-mono">${run.equity.toFixed(0)}</span>
          </span>
          <span className="text-slate-400">
            Square <span className="text-white">{run.currentSquareIndex + 1}/30</span>
          </span>
          {isRunOver && (
            <button
              onClick={endRun}
              className="text-xs px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              End Run
            </button>
          )}
        </div>
      </header>

      {/* Main layout: chart left, controls right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart panel */}
        <div className="flex-1 p-3 min-h-0">
          <Chart
            candles={run.candles}
            revealedCount={run.revealedCandleIndex}
            warmupCount={50}
            animating={run.awaitingTradeDecision}
            animationSpeedMs={300}
            className="h-full"
          />
        </div>

        {/* Right sidebar */}
        <aside className="w-72 flex flex-col border-l border-slate-800 overflow-y-auto">
          {/* Board */}
          <div className="relative p-3 border-b border-slate-800">
            <Board
              squares={run.squares}
              currentIndex={run.currentSquareIndex}
              previewableIndices={run.previewableSquares}
              onSquareClick={selectLandingSquare}
            />
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4 p-4">
            {/* Bias panel (always show unless awaiting trade) */}
            {!run.awaitingTradeDecision && !isRunOver && (
              <BiasPanel
                pending={run.pendingBiasGuess}
                streak={biasStreak}
                lastResult={lastBiasResult}
                disabled={run.diceValue !== null}
                onGuess={setBiasGuess}
              />
            )}

            {/* Dice (show when not awaiting trade decision) */}
            {!run.awaitingTradeDecision && !isRunOver && (
              <Dice
                value={run.diceValue}
                previewableSquares={previewSquares}
                disabled={false}
                onRoll={rollDice}
              />
            )}

            {/* Trade panel */}
            {run.awaitingTradeDecision && (
              <AnimatePresence>
                <motion.div
                  key="trade-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <TradePanel
                    equity={run.equity}
                    riskAmount={run.equity * 0.1}
                    biasDamageReduction={biasDamageReduction}
                    onAction={handleTradeAction}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Run over */}
            {isRunOver && (
              <div className="text-center py-4">
                <p className="text-lg font-bold text-yellow-400 mb-2">Run Complete!</p>
                <p className="text-sm text-slate-400 mb-4">
                  Final equity: <span className="text-white font-mono">${run.equity.toFixed(0)}</span>
                </p>
                <button
                  onClick={endRun}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
                >
                  View Scorecard
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ============ START SCREEN ============

function StartScreen({
  onStart,
  starting,
  stats,
}: {
  onStart: () => void
  starting: boolean
  stats: { totalRuns: number; avgBiasAccuracy: number }
}) {
  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-400 tracking-tight mb-2">TRADE ROGUELIKE</h1>
        <p className="text-slate-400 text-lg">XAUUSD · M5 · Deliberate Practice</p>
      </div>

      {stats.totalRuns > 0 && (
        <div className="flex gap-6 text-center text-sm">
          <div>
            <p className="text-2xl font-bold text-white">{stats.totalRuns}</p>
            <p className="text-slate-500">Runs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {(stats.avgBiasAccuracy * 100).toFixed(0)}%
            </p>
            <p className="text-slate-500">Bias Accuracy</p>
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
        {starting ? 'Loading…' : stats.totalRuns > 0 ? 'New Run' : 'Start Run'}
      </motion.button>

      <p className="text-xs text-slate-600 max-w-xs text-center">
        For education only — not financial advice
      </p>
    </div>
  )
}
