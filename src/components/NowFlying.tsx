'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Clock, Users, User } from 'lucide-react'
import type { QueueEntry } from '@/types/queue'

interface NowFlyingProps {
  entry: QueueEntry | null
  bufferMinutes: number
  onFlightEnd: () => void
}

export function NowFlying({ entry, bufferMinutes, onFlightEnd }: NowFlyingProps) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [phase, setPhase] = useState<'flying' | 'buffer' | 'idle'>('idle')

  useEffect(() => {
    if (!entry?.started_at) {
      setPhase('idle')
      return
    }

    const startedAt = new Date(entry.started_at).getTime()
    const flightMs = entry.duration_min * 60 * 1000
    const bufferMs = bufferMinutes * 60 * 1000

    const tick = () => {
      const now = Date.now()
      const elapsed = now - startedAt
      const flightEnd = startedAt + flightMs
      const bufferEnd = flightEnd + bufferMs

      if (now < flightEnd) {
        setPhase('flying')
        setSecondsLeft(Math.ceil((flightEnd - now) / 1000))
      } else if (now < bufferEnd) {
        setPhase('buffer')
        setSecondsLeft(Math.ceil((bufferEnd - now) / 1000))
        if (now >= flightEnd && now < flightEnd + 1000) {
          // Flight just ended — trigger advance
          onFlightEnd()
        }
      } else {
        setPhase('idle')
        setSecondsLeft(0)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [entry, bufferMinutes, onFlightEnd])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isShared = entry?.flight_type === 'shared'
  const TypeIcon = isShared ? Users : User

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ borderRadius: '24px' }}>
      {/* Animated gold gradient border */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: phase === 'flying'
            ? 'linear-gradient(135deg, rgba(201,168,76,0.4), rgba(30,58,110,0.8), rgba(201,168,76,0.4))'
            : phase === 'buffer'
            ? 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(15,32,64,0.9))'
            : 'linear-gradient(135deg, rgba(15,32,64,0.8), rgba(10,22,40,0.9))',
          padding: '1px',
          borderRadius: '24px',
        }}
      />

      <motion.div
        className="relative glass-bright rounded-2xl p-6"
        style={{ borderRadius: '24px' }}
        animate={phase === 'flying' ? { boxShadow: ['0 0 20px rgba(201,168,76,0.2)', '0 0 50px rgba(201,168,76,0.5)', '0 0 20px rgba(201,168,76,0.2)'] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-xl"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}
            >
              <Plane className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            </div>
            <span className="font-semibold text-sm text-white/80 uppercase tracking-widest">
              {phase === 'flying' ? 'עכשיו טס' : phase === 'buffer' ? 'הפסקת בטיחות' : 'המסלול פנוי'}
            </span>
          </div>

          {phase !== 'idle' && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold"
              style={{
                background: phase === 'flying' ? 'rgba(201,168,76,0.2)' : 'rgba(234,179,8,0.15)',
                border: `1px solid ${phase === 'flying' ? 'rgba(201,168,76,0.4)' : 'rgba(234,179,8,0.3)'}`,
                color: phase === 'flying' ? 'var(--gold-light)' : '#fde047',
              }}
            >
              <Clock className="w-3 h-3" />
              {formatTime(secondsLeft)}
            </div>
          )}
        </div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          {entry && phase !== 'idle' ? (
            <motion.div
              key={entry.id + phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))',
                    border: '2px solid rgba(201,168,76,0.4)',
                    color: 'var(--gold-light)',
                  }}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tracking-wide">{entry.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TypeIcon className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                    <span className="text-xs text-white/60">
                      {isShared ? 'טיסה משותפת' : 'טיסה עצמאית'} · {entry.duration_min} דקות
                    </span>
                  </div>
                </div>
              </div>

              {phase === 'buffer' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 rounded-xl text-sm text-center text-white/60"
                  style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
                >
                  מרווח בטיחות פעיל — הטיסה הבאה תתחיל בקרוב
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <p className="text-white/40 text-lg">המסלול מחכה לטייס הראשון</p>
              <p className="text-white/25 text-sm mt-1">הצטרף לתור למטה</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
