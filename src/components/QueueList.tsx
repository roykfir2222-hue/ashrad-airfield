'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, User, Clock, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { QueueEntry } from '@/types/queue'

interface QueueListProps {
  entries: QueueEntry[]
  onRemove: (id: string) => void
  onVerify: (id: string) => void
  isCurrentUserVerified: boolean
  bufferMinutes: number
  sharedDuration: number
}

export function QueueList({ entries, onRemove, onVerify, isCurrentUserVerified, bufferMinutes }: QueueListProps) {
  const verifiedEntries = entries.filter(e => e.is_verified)

  const getEstimatedWait = (entry: QueueEntry) => {
    if (!entry.is_verified) return null
    const myVerifiedIndex = verifiedEntries.findIndex(e => e.id === entry.id)
    let totalMins = 0
    for (let i = 0; i < myVerifiedIndex; i++) {
      totalMins += verifiedEntries[i].duration_min + bufferMinutes
    }
    return totalMins
  }

  const verifiedPosition = (entryId: string) =>
    verifiedEntries.findIndex(e => e.id === entryId) + 1

  const getModeLabel = (entry: QueueEntry) => {
    const labels = entry.flight_modes.map(m => m === 'shared' ? 'משותף' : 'עצמאי')
    return labels.join(', ')
  }

  const hasBothModes = (entry: QueueEntry) =>
    entry.flight_modes.includes('independent') && entry.flight_modes.includes('shared')

  const primaryIsShared = (entry: QueueEntry) =>
    !entry.flight_modes.includes('independent') && entry.flight_modes.includes('shared')

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {entries.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 text-white/30"
          >
            <p className="text-lg">התור ריק</p>
            <p className="text-sm mt-1">הוסף את שמך להתחיל</p>
          </motion.div>
        ) : (
          entries.map((entry) => {
            const waitMins = getEstimatedWait(entry)
            const isPending = !entry.is_verified
            const vPos = isPending ? null : verifiedPosition(entry.id)
            const bothModes = hasBothModes(entry)
            const isShared = primaryIsShared(entry)
            const modeLabel = getModeLabel(entry)

            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: isPending ? 0.7 : 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="group relative flex items-center gap-3 px-4 py-3 rounded-2xl cursor-default"
                style={{
                  background: isPending
                    ? 'rgba(30,20,10,0.5)'
                    : bothModes
                    ? 'rgba(25,45,85,0.5)'
                    : isShared
                    ? 'rgba(30,58,110,0.35)'
                    : 'rgba(15,32,64,0.5)',
                  border: isPending
                    ? '1px solid rgba(234,179,8,0.2)'
                    : bothModes
                    ? '1px solid rgba(201,168,76,0.35)'
                    : isShared
                    ? '1px solid rgba(201,168,76,0.25)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px',
                }}
              >
                {/* Position badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: isPending
                      ? 'rgba(234,179,8,0.1)'
                      : vPos === 1
                      ? 'rgba(201,168,76,0.25)'
                      : 'rgba(255,255,255,0.06)',
                    border: isPending
                      ? '1px solid rgba(234,179,8,0.25)'
                      : vPos === 1
                      ? '1px solid rgba(201,168,76,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    color: isPending
                      ? 'rgba(234,179,8,0.6)'
                      : vPos === 1
                      ? 'var(--gold-light)'
                      : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {isPending ? '?' : vPos}
                </div>

                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0"
                  style={{
                    background: isPending
                      ? 'rgba(30,20,10,0.6)'
                      : 'linear-gradient(135deg, var(--navy-600), var(--navy-500))',
                    border: isPending
                      ? '1px solid rgba(234,179,8,0.2)'
                      : '1px solid rgba(255,255,255,0.12)',
                    color: isPending ? 'rgba(234,179,8,0.5)' : 'white',
                  }}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p
                      className="font-semibold truncate"
                      style={{ color: isPending ? 'rgba(255,255,255,0.5)' : 'white' }}
                    >
                      {entry.name}
                    </p>
                    {entry.is_verified && (
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
                    )}
                  </div>

                  {isPending ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <ShieldAlert className="w-3 h-3" style={{ color: 'rgba(234,179,8,0.6)' }} />
                      <span className="text-xs" style={{ color: 'rgba(234,179,8,0.7)' }}>
                        ממתין לאישור נוכחות
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {/* Mode icons + labels */}
                      {bothModes ? (
                        <>
                          <User className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
                          <Users className="w-3 h-3" style={{ color: 'var(--gold)' }} />
                        </>
                      ) : isShared ? (
                        <Users className="w-3 h-3" style={{ color: 'var(--gold)' }} />
                      ) : (
                        <User className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                      )}
                      <span
                        className="text-xs font-medium"
                        style={{ color: bothModes ? 'var(--gold-light)' : isShared ? 'var(--gold)' : 'rgba(255,255,255,0.4)' }}
                      >
                        {modeLabel}
                      </span>
                      <span className="text-xs text-white/25">·</span>
                      <span className="text-xs text-white/35">{entry.duration_min} דק׳</span>
                    </div>
                  )}
                </div>

                {/* Wait estimate (verified only) */}
                {!isPending && (
                  <div className="flex items-center gap-1 text-xs text-white/30 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{waitMins! > 0 ? `~${waitMins} דק׳` : 'הבא!'}</span>
                  </div>
                )}

                {/* Verify button */}
                {isCurrentUserVerified && isPending && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onVerify(entry.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 cursor-pointer"
                    style={{
                      background: 'rgba(201,168,76,0.15)',
                      border: '1px solid rgba(201,168,76,0.4)',
                      color: 'var(--gold-light)',
                    }}
                    aria-label={`אשר הגעת ${entry.name}`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    אשר הגעה
                  </motion.button>
                )}

                {/* Remove button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onRemove(entry.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                  }}
                  aria-label={`הסר את ${entry.name} מהתור`}
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            )
          })
        )}
      </AnimatePresence>
    </div>
  )
}
