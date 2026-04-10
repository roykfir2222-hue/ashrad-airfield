'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { QueueEntry, FlightType } from '@/types/queue'

const BUFFER_MINUTES = 20
const SHARED_DURATION = 12
const INDEPENDENT_RATIO = 2 // every 2 independent → 1 shared

/** Build the scheduled queue from DB rows with the 2:1 ratio rule */
export function buildScheduledQueue(active: QueueEntry[]): QueueEntry[] {
  // Sort by position (DB-side ordering)
  return [...active].sort((a, b) => a.position - b.position)
}

/** Determine the flight type for the NEXT slot according to the 2:1 rule */
export function nextSlotType(queue: QueueEntry[]): FlightType {
  // Count consecutive independent slots since last shared
  let indepSinceShared = 0
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].flight_type === 'shared') break
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

  // Real-time subscription
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

  /** Add a new user to the queue */
  const joinQueue = useCallback(async (
    name: string,
    flightType: FlightType,
    durationMin: number
  ) => {
    // Get max position
    const { data: maxRow } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('is_active', true)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPos = (maxRow?.position ?? 0) + 1

    await supabase.from('queue_entries').insert({
      name,
      flight_type: flightType,
      duration_min: flightType === 'shared' ? SHARED_DURATION : durationMin,
      position: nextPos,
      status: 'waiting',
      is_active: true,
    })
  }, [supabase])

  /** Mark user as 'Left' — full removal from system */
  const leaveQueue = useCallback(async (id: string) => {
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: new Date().toISOString() })
      .eq('id', id)
  }, [supabase])

  /** Social delete — any user can remove someone not present */
  const socialDelete = useCallback(async (id: string) => {
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: new Date().toISOString() })
      .eq('id', id)
  }, [supabase])

  /** Advance queue: mark current flyer as done, re-queue them at end (unless shared),
   *  start next pilot (respecting no-consecutive rule) */
  const advanceFlight = useCallback(async () => {
    if (!nowFlying) return

    const isShared = nowFlying.flight_type === 'shared'
    const now = new Date().toISOString()

    // Mark current as done (deactivate)
    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: now })
      .eq('id', nowFlying.id)

    // Re-queue if not shared
    if (!isShared) {
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
        flight_type: nowFlying.flight_type,
        duration_min: nowFlying.duration_min,
        position: nextPos,
        status: 'waiting',
        is_active: true,
      })
    }

    // Start next pilot (skip consecutive same-user, skip shared until ratio met)
    await fetchQueue()
  }, [nowFlying, supabase, fetchQueue])

  /** Mark next in waiting as flying */
  const startNextFlight = useCallback(async () => {
    if (waitingQueue.length === 0) return

    // No consecutive: skip if same name as nowFlying
    let nextEntry = waitingQueue[0]
    if (nowFlying && nextEntry.name === nowFlying.name && waitingQueue.length > 1) {
      nextEntry = waitingQueue[1]
    }

    await supabase
      .from('queue_entries')
      .update({ status: 'flying', started_at: new Date().toISOString() })
      .eq('id', nextEntry.id)
  }, [waitingQueue, nowFlying, supabase])

  return {
    queue,
    waitingQueue,
    nowFlying,
    loading,
    joinQueue,
    leaveQueue,
    socialDelete,
    advanceFlight,
    startNextFlight,
    BUFFER_MINUTES,
    SHARED_DURATION,
  }
}
