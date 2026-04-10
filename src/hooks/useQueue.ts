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
    flightType: FlightType,
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

    const { data, error } = await supabase
      .from('queue_entries')
      .insert({
        name,
        flight_type: flightType,
        duration_min: flightType === 'shared' ? SHARED_DURATION : durationMin,
        position: nextPos,
        status: 'waiting',
        is_active: true,
      })
      .select('id')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Insert failed')

    // Immediately refresh local state — don't wait for the realtime event
    await fetchQueue()

    return data.id as string
  }, [supabase, fetchQueue])

  /** Remove a user from the system (self or social delete) */
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

  const advanceFlight = useCallback(async () => {
    if (!nowFlying) return

    const isShared = nowFlying.flight_type === 'shared'
    const now = new Date().toISOString()

    await supabase
      .from('queue_entries')
      .update({ is_active: false, status: 'done', finished_at: now })
      .eq('id', nowFlying.id)

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

    await fetchQueue()
  }, [nowFlying, supabase, fetchQueue])

  const startNextFlight = useCallback(async () => {
    // Query fresh from DB — avoids stale React state after a just-completed insert
    const { data: freshWaiting } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'waiting')
      .order('position', { ascending: true })

    if (!freshWaiting || freshWaiting.length === 0) return

    const { data: freshFlying } = await supabase
      .from('queue_entries')
      .select('name')
      .eq('is_active', true)
      .eq('status', 'flying')
      .maybeSingle()

    let nextEntry = freshWaiting[0]
    // No-consecutive rule: skip if same name as current flyer
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
    advanceFlight,
    startNextFlight,
    BUFFER_MINUTES,
    SHARED_DURATION,
  }
}
