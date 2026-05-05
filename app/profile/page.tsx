'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getGameRuns, type GameRun } from '@/lib/db'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router  = useRouter()
  const [runs,    setRuns]    = useState<GameRun[]>([])
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const sb   = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const r = await getGameRuns(user.id)
      setRuns(r)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  const bestEquity = runs.length ? Math.max(...runs.map(r => r.equity_final)) : null
  const avgBias    = runs.length
    ? (runs.reduce((s, r) => s + r.bias_accuracy, 0) / runs.length * 100).toFixed(0)
    : null

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-lg font-bold">My Profile</h1>
          <p className="text-xs text-slate-500">{email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/')}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400
                       text-slate-900 font-bold transition-colors"
          >
            Play →
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-600
                       text-slate-400 hover:border-slate-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats summary */}
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatCard label="Runs" value={String(runs.length)} />
          <StatCard label="Best equity" value={`$${bestEquity?.toFixed(0)}`} />
          <StatCard label="Avg bias" value={`${avgBias}%`} />
        </div>
      )}

      {/* Run history */}
      <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3">Run History</h2>

      {runs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 text-sm">No runs yet.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-3 text-amber-400 text-sm hover:text-amber-300 transition-colors"
          >
            Play your first run →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {runs.map((run, i) => (
            <div
              key={run.id}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-600 text-xs font-mono w-5 text-right shrink-0">
                  #{run.run_number ?? runs.length - i}
                </span>
                <div>
                  <p className="text-sm text-white font-medium">{run.archetype}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(run.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' · '}Bias {(run.bias_accuracy * 100).toFixed(0)}%
                    {' · '}{run.total_trades} trades
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-mono font-bold ${
                  run.equity_final >= 1000 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  ${run.equity_final.toFixed(0)}
                </p>
                <p className={`text-[11px] font-mono ${
                  run.equity_final >= 1000 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {run.equity_final >= 1000 ? '+' : ''}{((run.equity_final - 1000) / 10).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-white font-bold font-mono text-base mt-0.5">{value}</p>
    </div>
  )
}
