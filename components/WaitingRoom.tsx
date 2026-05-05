'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getActiveCount } from '@/lib/db'

const MAX_PLAYERS = 20

export default function WaitingRoom({ onRetry }: { onRetry: () => void }) {
  const [count, setCount]       = useState(MAX_PLAYERS)
  const [checking, setChecking] = useState(false)

  // Auto-refresh count every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      const n = await getActiveCount()
      setCount(n)
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  async function handleRetry() {
    setChecking(true)
    const n = await getActiveCount()
    setCount(n)
    setChecking(false)
    if (n < MAX_PLAYERS) onRetry()
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4 text-center"
      >
        <p className="text-4xl">⏳</p>

        <div>
          <h2 className="text-white font-bold text-lg">Game is full</h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${i < count ? 'bg-amber-400' : 'bg-slate-700'}`}
                />
              ))}
            </div>
          </div>
          <p className="text-amber-400 font-mono font-bold text-xl mt-2">
            {count}/{MAX_PLAYERS} players online
          </p>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed">
          All 20 testing slots are taken right now.<br />
          Slots free up automatically when players finish or leave.
        </p>

        <p className="text-slate-500 text-xs">
          Try again in a few minutes — this page refreshes the count every 30 seconds.
        </p>

        <motion.button
          onClick={handleRetry}
          disabled={checking}
          whileHover={!checking ? { scale: 1.02 } : {}}
          whileTap={!checking ? { scale: 0.98 } : {}}
          className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600
                     text-white font-bold text-sm transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking…' : 'Check again'}
        </motion.button>
      </motion.div>
    </div>
  )
}
