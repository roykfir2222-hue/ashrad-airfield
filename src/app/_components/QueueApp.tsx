'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlaneTakeoff, Users, LogOut, WifiOff, RefreshCw } from 'lucide-react'
import { Header } from '@/components/Header'
import { NowFlying } from '@/components/NowFlying'
import { QueueList } from '@/components/QueueList'
import { JoinModal } from '@/components/JoinModal'
import { SafetyModal } from '@/components/SafetyModal'
import { useQueue } from '@/hooks/useQueue'
import type { FlightType } from '@/types/queue'

export default function QueueApp() {
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [safetyModalOpen, setSafetyModalOpen] = useState(false)
  const [myEntryId, setMyEntryId] = useState<string | null>(null)

  const ttsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ttsAnnouncedRef = useRef<string | null>(null)

  const {
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
  } = useQueue()

  const isCurrentUserVerified =
    myEntryId !== null &&
    (
      waitingQueue.some(e => e.id === myEntryId && e.is_verified) ||
      nowFlying?.id === myEntryId
    )

  // 2-minute TTS warning
  useEffect(() => {
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current)
      ttsTimeoutRef.current = null
    }

    if (!nowFlying?.started_at) return
    const nextVerified = waitingQueue.find(e => e.is_verified)
    if (!nextVerified) return

    const flightEnd = new Date(nowFlying.started_at).getTime() + nowFlying.duration_min * 60 * 1000
    const bufferEnd = flightEnd + BUFFER_MINUTES * 60 * 1000
    const warningTime = bufferEnd - 2 * 60 * 1000
    const delay = warningTime - Date.now()
    const announcementKey = `${nowFlying.id}-${nextVerified.id}`

    if (delay <= 0 || ttsAnnouncedRef.current === announcementKey) return

    ttsTimeoutRef.current = setTimeout(() => {
      ttsAnnouncedRef.current = announcementKey
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`${nextVerified.name}, עוד 2 דקות תורך`)
        utterance.lang = 'he-IL'
        window.speechSynthesis.speak(utterance)
      }
    }, delay)

    return () => {
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current)
    }
  }, [nowFlying, waitingQueue, BUFFER_MINUTES])

  const handleJoin = useCallback(async (name: string, modes: FlightType[], duration: number) => {
    const id = await joinQueue(name, modes, duration)
    setMyEntryId(id)
    setSafetyModalOpen(true)
    if (!nowFlying) {
      await startNextFlight()
    }
  }, [joinQueue, nowFlying, startNextFlight])

  const handleLeave = useCallback(async () => {
    if (!myEntryId) return
    await leaveQueue(myEntryId)
    setMyEntryId(null)
  }, [myEntryId, leaveQueue])

  const handleFlightEnd = useCallback(async () => {
    await advanceFlight()
    await startNextFlight()
  }, [advanceFlight, startNextFlight])

  const handleFinishFlight = useCallback(async () => {
    if (!nowFlying || nowFlying.id !== myEntryId) return
    const newId = await finishMyFlight(nowFlying)
    setMyEntryId(newId)
    await startNextFlight()
  }, [nowFlying, myEntryId, finishMyFlight, startNextFlight])

  const handleRemoveFlyer = useCallback(async () => {
    if (!nowFlying) return
    await leaveQueue(nowFlying.id)
    if (nowFlying.id === myEntryId) setMyEntryId(null)
    await startNextFlight()
  }, [nowFlying, myEntryId, leaveQueue, startNextFlight])

  const hasJoined = myEntryId !== null
  const isMyFlight = nowFlying?.id === myEntryId

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--navy-950)' }}>
      <Header />

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-2xl mx-auto px-4 pt-3"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
              }}
            >
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">שגיאת חיבור: {error}</span>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                רענן
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 space-y-6">

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 30 }}
        >
          <NowFlying
            entry={nowFlying}
            bufferMinutes={BUFFER_MINUTES}
            onFlightEnd={handleFlightEnd}
            isMyFlight={isMyFlight}
            onFinishFlight={handleFinishFlight}
            onRemoveFlyer={handleRemoveFlyer}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
          className="glass rounded-2xl p-5"
          style={{ borderRadius: '20px' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <h2 className="font-bold text-white text-base tracking-tight">התור</h2>
              {waitingQueue.length > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums"
                  style={{
                    background: 'rgba(201,168,76,0.2)',
                    border: '1px solid rgba(201,168,76,0.4)',
                    color: 'var(--gold-light)',
                  }}
                >
                  {waitingQueue.length}
                </span>
              )}
            </div>

            <div
              className="text-xs text-white/30 px-3 py-1 rounded-full"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
            >
              2:1 עצמאי/משותף · 20 דק׳ הפסקה
            </div>
          </div>

          {loading ? (
            <div className="space-y-2" aria-busy="true">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-16 rounded-xl animate-pulse"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
          ) : (
            <QueueList
              entries={waitingQueue}
              onRemove={socialDelete}
              onVerify={verifyEntry}
              isCurrentUserVerified={isCurrentUserVerified}
              bufferMinutes={BUFFER_MINUTES}
              sharedDuration={SHARED_DURATION}
            />
          )}
        </motion.section>

        <div className="h-24" />
      </main>

      {/* FAB row */}
      <div
        className="fixed bottom-6 flex gap-3 z-30"
        style={{ left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 2rem)', maxWidth: '40rem' }}
      >
        <AnimatePresence>
          {hasJoined && (
            <motion.button
              key="leave"
              initial={{ opacity: 0, scale: 0.85, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLeave}
              className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-semibold text-sm cursor-pointer flex-1"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                borderRadius: '20px',
                willChange: 'transform',
              }}
            >
              <LogOut className="w-4 h-4" />
              יצאתי
            </motion.button>
          )}
        </AnimatePresence>

        {!hasJoined ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setJoinModalOpen(true)}
            className="flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base cursor-pointer flex-[3]"
            style={{
              background: 'linear-gradient(135deg, #1e3a6e, #2a4d8f)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'white',
              borderRadius: '20px',
              boxShadow: '0 4px 24px rgba(42,77,143,0.4)',
              willChange: 'transform',
            }}
          >
            <PlaneTakeoff className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            הגעתי — הצטרף לתור
          </motion.button>
        ) : (
          <div
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-sm flex-[3]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.35)',
              borderRadius: '20px',
            }}
          >
            <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>✓</span>
            אתה בתור
          </div>
        )}
      </div>

      <JoinModal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoin={handleJoin}
      />

      <SafetyModal
        open={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
      />
    </div>
  )
}
