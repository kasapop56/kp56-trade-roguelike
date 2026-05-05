'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

type Step = 'email' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [step,  setStep]  = useState<Step>('email')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const sb = createClient()
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setStep('sent')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo area */}
        <div className="text-center mb-8">
          <p className="text-3xl mb-2">🎲</p>
          <h1 className="text-xl font-bold text-white">Trade Roguelike</h1>
          <p className="text-xs text-slate-500 mt-1">Beta — Real XAUUSD M5 Data</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4"
            >
              <div>
                <h2 className="text-white font-semibold text-base">Sign in to play</h2>
                <p className="text-slate-500 text-xs mt-1">
                  Enter your email — we&apos;ll send you a magic link. No password needed.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3
                             text-white placeholder-slate-500 text-sm
                             focus:outline-none focus:border-amber-500 transition-colors"
                />

                {error && (
                  <p className="text-rose-400 text-xs">{error}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading || !email.trim()}
                  whileHover={!loading ? { scale: 1.02 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400
                             text-slate-900 font-bold text-sm transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending…' : 'Send magic link →'}
                </motion.button>
              </form>

              <p className="text-[11px] text-slate-600 text-center leading-relaxed">
                This is a beta test. Your runs and feedback are saved to help improve the game.
              </p>
            </motion.div>
          )}

          {step === 'sent' && (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-emerald-800 rounded-2xl p-6 flex flex-col gap-3 text-center"
            >
              <p className="text-3xl">📬</p>
              <h2 className="text-white font-semibold">Check your inbox</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                We sent a magic link to<br />
                <span className="text-amber-400 font-medium">{email}</span>
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                Click the link in the email to sign in.<br />
                It expires in 1 hour.
              </p>
              <button
                onClick={() => { setStep('email'); setEmail('') }}
                className="text-xs text-slate-600 hover:text-slate-400 mt-2 transition-colors"
              >
                Use a different email
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
