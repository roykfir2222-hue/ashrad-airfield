'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { QueueEntry, FlightType } from '@/types/queue'

const BUFFER_MINUTES = 20
const SHARED_DURATION = 12
const INDEPENDENT_RATIO = 2

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
  const supabase = createClient()
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (!error && data) {
      setQueue(data as QueueEntry[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchQueue()

    const channel = supabase
      .channel('queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries' },
        () => { fetchQueue() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchQueue, supabase])

  const nowFlying = queue.find(e => e.status === 'flying') ?? null
  const waitingQueue = queue.filter(e => e.status === 'waiting')

  /** Add a new user to the queue. Returns the new entry's id. */
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

    const { data, error } = await supabase
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

    if (error || !data) throw new Error(error?.message ?? 'Insert failed')

    await fetchQueue()

    return data.id as string
  }, [supabase, fetchQueue])

  /** Remove a user from the system (self-leave) */
  const leaveQueue = useCallback(async (id: string) => {
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: new Date().toISOString() })
      .eq('id', id)
  }, [supabase])

  const socialDelete = useCallback(async (id: string) => {
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: new Date().toISOString() })
      .eq('id', id)
  }, [supabase])

  /** Verify a queue entry (buddy system) */
  const verifyEntry = useCallback(async (id: string) => {
    await supabase
      .from('queue_entries')
      .update({ is_verified: true })
      .eq('id', id)
    await fetchQueue()
  }, [supabase, fetchQueue])

  /** Auto-advance when time runs out (re-queues independent flyers) */
  const advanceFlight = useCallback(async () => {
    if (!nowFlying) return

    const isSharedOnly =
      nowFlying.flight_modes.includes('shared') &&
      !nowFlying.flight_modes.includes('independent')
    const now = new Date().toISOString()

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

      const nextPos = (maxRow?.position ?? 0) + 1

      await supabase.from('queue_entries').insert({
        name: nowFlying.name,
        flight_modes: nowFlying.flight_modes,
        duration_min: nowFlying.duration_min,
        position: nextPos,
        status: 'waiting',
        is_active: true,
        is_verified: true,
      })
    }

    await fetchQueue()
  }, [nowFlying, supabase, fetchQueue])

  /**
   * "סיימתי להטיס" — user manually ends their flight.
   * Always re-queues them at the very end.
   * Returns the new entry's id so the caller can update myEntryId.
   */
  const finishMyFlight = useCallback(async (entry: QueueEntry): Promise<string> => {
    const now = new Date().toISOString()

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

    const nextPos = (maxRow?.position ?? 0) + 1

    const { data, error } = await supabase
      .from('queue_entries')
      .insert({
        name: entry.name,
        flight_modes: entry.flight_modes,
        duration_min: entry.duration_min,
        position: nextPos,
        status: 'waiting',
        is_active: true,
        is_verified: true,
      })
      .select('id')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Re-queue failed')

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

    await supabase
      .from('queue_entries')
      .update({ status: 'flying', started_at: new Date().toISOString() })
      .eq('id', nextEntry.id)

    await fetchQueue()
  }, [supabase, fetchQueue])

  return {
    queue,
    waitingQueue,
    nowFlying,
    loading,
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
