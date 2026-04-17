'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { QueueEntry, FlightType } from '@/types/queue'

const BUFFER_MINUTES = 20
const SHARED_DURATION = 12
const INDEPENDENT_RATIO = 2

// Handles old schema (flight_type string), new schema (flight_modes array), and null.
function normalizeEntry(row: Record<string, unknown>): QueueEntry {
  let modes: FlightType[]
  if (Array.isArray(row.flight_modes) && row.flight_modes.length > 0) {
    modes = row.flight_modes as FlightType[]
  } else if (typeof row.flight_type === 'string') {
    modes = [row.flight_type as FlightType]
  } else {
    modes = ['independent']
  }
  return { ...row, flight_modes: modes } as QueueEntry
}

export function buildScheduledQueue(active: QueueEntry[]): QueueEntry[] {
  return [...active].sort((a, b) => a.position - b.position)
}

export function nextSlotType(queue: QueueEntry[]): FlightType {
  let indepSinceShared = 0
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].flight_modes.includes('shared')) break
    indepSinceShared++
  }
  return indepSinceShared >= INDEPENDENT_RATIO ? 'shared' : 'independent'
}

export function useQueue() {
  // Module-level singleton — stable across every render and StrictMode double-invoke.
  const supabase = useRef(createClient()).current

  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── fetchQueue ────────────────────────────────────────────────────────────
  // Stored in a ref so the realtime handler always calls the latest version
  // without needing it as a dependency (which would tear down the subscription).
  const fetchQueue = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true })

      if (fetchError) throw fetchError
      if (data) setQueue(data.map(normalizeEntry))
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[useQueue] fetch failed:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchRef = useRef(fetchQueue)
  fetchRef.current = fetchQueue   // always up-to-date, no stale closure

  // ─── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    // Initial load
    fetchRef.current()

    // Unique name per mount prevents StrictMode double-mount channel collisions.
    const channelName = `queue-${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries' },
        (payload: { eventType: string }) => {
          console.log('[Realtime] event:', payload.eventType)
          fetchRef.current()
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log('[Realtime] status:', status)
        if (err) console.error('[Realtime] error:', err)
      })

    // Cleanup: fully remove the channel so no ghost listeners remain.
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase]) // supabase is a stable singleton — runs exactly once

  // ─── Polling fallback ──────────────────────────────────────────────────────
  // Guarantees sync even if Realtime is misconfigured or the network hiccups.
  useEffect(() => {
    const timer = setInterval(() => fetchRef.current(), 5000)
    return () => clearInterval(timer)
  }, [])

  // ─── Tab visibility refetch ────────────────────────────────────────────────
  // Refreshes stale data when the user returns to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchRef.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ─── Derived state ─────────────────────────────────────────────────────────
  const nowFlying = queue.find(e => e.status === 'flying') ?? null
  const waitingQueue = queue.filter(e => e.status === 'waiting')

  // ─── Actions ───────────────────────────────────────────────────────────────

  const joinQueue = useCallback(async (
    name: string,
    flightModes: FlightType[],
    durationMin: number
  ): Promise<string> => {
    const { data: maxRow } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('is_active', true)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPos = (maxRow?.position ?? 0) + 1
    const isFirst = !maxRow

    const { data, error: insertError } = await supabase
      .from('queue_entries')
      .insert({
        name,
        flight_modes: flightModes,
        duration_min: durationMin,
        position: nextPos,
        status: 'waiting',
        is_active: true,
        is_verified: isFirst,
      })
      .select('id')
      .single()

    if (insertError || !data) throw new Error(insertError?.message ?? 'Insert failed')
    await fetchQueue()
    return data.id as string
  }, [supabase, fetchQueue])

  // Optimistic: remove from UI immediately, then persist to DB.
  const leaveQueue = useCallback(async (id: string) => {
    setQueue(prev => prev.filter(e => e.id !== id))
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: new Date().toISOString() })
      .eq('id', id)
    await fetchQueue()
  }, [supabase, fetchQueue])

  const socialDelete = useCallback(async (id: string) => {
    setQueue(prev => prev.filter(e => e.id !== id))
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: new Date().toISOString() })
      .eq('id', id)
    await fetchQueue()
  }, [supabase, fetchQueue])

  // Optimistic: flip verified flag immediately for all screens watching.
  const verifyEntry = useCallback(async (id: string) => {
    setQueue(prev => prev.map(e => e.id === id ? { ...e, is_verified: true } : e))
    await supabase
      .from('queue_entries')
      .update({ is_verified: true })
      .eq('id', id)
    await fetchQueue()
  }, [supabase, fetchQueue])

  const advanceFlight = useCallback(async () => {
    if (!nowFlying) return
    const isSharedOnly =
      nowFlying.flight_modes.includes('shared') &&
      !nowFlying.flight_modes.includes('independent')
    const now = new Date().toISOString()

    setQueue(prev => prev.filter(e => e.id !== nowFlying.id))
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: now })
      .eq('id', nowFlying.id)

    if (!isSharedOnly) {
      const { data: maxRow } = await supabase
        .from('queue_entries')
        .select('position')
        .eq('is_active', true)
        .order('position', { ascending: false })
        .limit(1)
        .single()

      await supabase.from('queue_entries').insert({
        name: nowFlying.name,
        flight_modes: nowFlying.flight_modes,
        duration_min: nowFlying.duration_min,
        position: (maxRow?.position ?? 0) + 1,
        status: 'waiting',
        is_active: true,
        is_verified: true,
      })
    }
    await fetchQueue()
  }, [nowFlying, supabase, fetchQueue])

  const finishMyFlight = useCallback(async (entry: QueueEntry): Promise<string> => {
    const now = new Date().toISOString()
    setQueue(prev => prev.filter(e => e.id !== entry.id))

    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: now })
      .eq('id', entry.id)

    const { data: maxRow } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('is_active', true)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const { data, error: requeueError } = await supabase
      .from('queue_entries')
      .insert({
        name: entry.name,
        flight_modes: entry.flight_modes,
        duration_min: entry.duration_min,
        position: (maxRow?.position ?? 0) + 1,
        status: 'waiting',
        is_active: true,
        is_verified: true,
      })
      .select('id')
      .single()

    if (requeueError || !data) throw new Error(requeueError?.message ?? 'Re-queue failed')
    await fetchQueue()
    return data.id as string
  }, [supabase, fetchQueue])

  const startNextFlight = useCallback(async () => {
    const { data: freshWaiting } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'waiting')
      .eq('is_verified', true)
      .order('position', { ascending: true })

    if (!freshWaiting || freshWaiting.length === 0) return

    const { data: freshFlying } = await supabase
      .from('queue_entries')
      .select('name')
      .eq('is_active', true)
      .eq('status', 'flying')
      .maybeSingle()

    let nextEntry = freshWaiting[0]
    if (freshFlying && nextEntry.name === freshFlying.name && freshWaiting.length > 1) {
      nextEntry = freshWaiting[1]
    }

    const startedAt = new Date().toISOString()
    setQueue(prev => prev.map(e =>
      e.id === nextEntry.id
        ? { ...normalizeEntry(nextEntry as Record<string, unknown>), status: 'flying', started_at: startedAt }
        : e
    ))

    await supabase
      .from('queue_entries')
      .update({ status: 'flying', started_at: startedAt })
      .eq('id', nextEntry.id)

    await fetchQueue()
  }, [supabase, fetchQueue])

  return {
    queue,
    waitingQueue,
    nowFlying,
    loading,
    error,
    joinQueue,
    leaveQueue,
    socialDelete,
    verifyEntry,
    advanceFlight,
    finishMyFlight,
    startNextFlight,
    BUFFER_MINUTES,
    SHARED_DURATION,
  }
}
