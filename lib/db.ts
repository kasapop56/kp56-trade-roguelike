/**
 * All Supabase DB operations in one place.
 * Always call createClient() per request — never share across users.
 */
import { createClient } from '@/lib/supabase'
import type { RunSummary } from '@/lib/archetypeEngine'

// ============ TYPES ============

export type Profile = {
  user_id: string
  run_count: number
  intro_seen: boolean
  created_at: string
}

export type GameRun = {
  id: string
  user_id: string
  created_at: string
  archetype: string
  equity_final: number
  equity_start: number
  bias_accuracy: number
  total_trades: number
  win_rate: number
  run_number: number
  trades_json: unknown
}

export type FeedbackRow = {
  id?: string
  user_id: string
  submitted_at_run: number
  fun_rating: number | null
  learn_rating: number | null
  difficulty_rating: number | null
  liked_features: string[]
  confused_features: string[]
  wanted_features: string[]
  felt_wrong: string
  feature_request: string
  general_comment: string
  trading_experience: string
  run_archetype: string
  run_equity_final: number
  run_bias_accuracy: number
}

// ============ PROFILE ============

export async function getProfile(userId: string): Promise<Profile | null> {
  const sb = createClient()
  const { data } = await sb.from('profiles').select('*').eq('user_id', userId).single()
  return data ?? null
}

export async function ensureProfile(userId: string): Promise<Profile> {
  const sb = createClient()
  const { data } = await sb
    .from('profiles')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select()
    .single()
  // If upsert returned nothing (row existed), fetch it
  if (data) return data
  const { data: existing } = await sb.from('profiles').select('*').eq('user_id', userId).single()
  return existing!
}

export async function markIntroSeen(userId: string) {
  const sb = createClient()
  await sb.from('profiles').update({ intro_seen: true }).eq('user_id', userId)
}

export async function incrementRunCount(userId: string): Promise<number> {
  const sb = createClient()
  // Fetch current, then increment
  const { data: p } = await sb.from('profiles').select('run_count').eq('user_id', userId).single()
  const next = (p?.run_count ?? 0) + 1
  await sb.from('profiles').update({ run_count: next }).eq('user_id', userId)
  return next
}

// ============ ACTIVE SESSIONS ============

export async function getActiveCount(): Promise<number> {
  const sb = createClient()
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString()
  const { count } = await sb
    .from('active_sessions')
    .select('*', { count: 'exact', head: true })
    .gt('last_ping', cutoff)
  return count ?? 0
}

export async function startSession(userId: string) {
  const sb = createClient()
  await sb.from('active_sessions').upsert(
    { user_id: userId, started_at: new Date().toISOString(), last_ping: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
}

export async function pingSession(userId: string) {
  const sb = createClient()
  await sb.from('active_sessions').update({ last_ping: new Date().toISOString() }).eq('user_id', userId)
}

export async function endSession(userId: string) {
  const sb = createClient()
  await sb.from('active_sessions').delete().eq('user_id', userId)
}

// ============ GAME RUNS ============

export async function saveGameRun(userId: string, summary: RunSummary, runNumber: number) {
  const sb = createClient()
  const totalTrades = summary.trades.filter(t => t.outcome !== 'skip').length
  const wins        = summary.trades.filter(t => t.outcome === 'win').length
  await sb.from('game_runs').insert({
    user_id:       userId,
    archetype:     summary.archetype,
    equity_final:  summary.finalEquity,
    equity_start:  1000,
    bias_accuracy: summary.biasAccuracy,
    total_trades:  totalTrades,
    win_rate:      totalTrades > 0 ? wins / totalTrades : 0,
    run_number:    runNumber,
    trades_json:   summary.trades,
  })
}

export async function getGameRuns(userId: string): Promise<GameRun[]> {
  const sb = createClient()
  const { data } = await sb
    .from('game_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

// ============ FEEDBACK ============

export async function getFeedback(userId: string): Promise<FeedbackRow | null> {
  const sb = createClient()
  const { data } = await sb.from('feedback').select('*').eq('user_id', userId).single()
  return data ?? null
}

export async function upsertFeedback(row: FeedbackRow) {
  const sb = createClient()
  await sb.from('feedback').upsert(
    { ...row, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
}
