'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, User, Clock } from 'lucide-react'
import type { QueueEntry } from '@/types/queue'

interface QueueListProps {
  entries: QueueEntry[]
  onRemove: (id: string) => void
  bufferMinutes: number
  sharedDuration: number
}

export function QueueList({ entries, onRemove, bufferMinutes, sharedDuration }: QueueListProps) {
  const getEstimatedWait = (index: number) => {
    let totalMins = 0
    for (let i = 0; i < index; i++) {
      const e = entries[i]
      totalMins += e.duration_min + bufferMinutes
    }
    return totalMins
  }

  const typeLabel = (e: QueueEntry) => {
    if (e.flight_type === 'shared') return 'משותף'
    if (e.flight_type === 'both') return 'גמיש'
    return 'עצמאי'
  }

  const TypeIcon = (e: QueueEntry) => e.flight_type === 'shared' ? Users : User

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
          entries.map((entry, index) => {
            const Icon = TypeIcon(entry)
            const waitMins = getEstimatedWait(index)
            const isShared = entry.flight_type === 'shared'

            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="group relative flex items-center gap-4 px-4 py-3 rounded-2xl cursor-default"
                style={{
                  background: isShared
                    ? 'rgba(30,58,110,0.35)'
                    : 'rgba(15,32,64,0.5)',
                  border: isShared
                    ? '1px solid rgba(201,168,76,0.25)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px',
                }}
              >
                {/* Position badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: index === 0
                      ? 'rgba(201,168,76,0.25)'
                      : 'rgba(255,255,255,0.06)',
                    border: index === 0
                      ? '1px solid rgba(201,168,76,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    color: index === 0 ? 'var(--gold-light)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--navy-600), var(--navy-500))',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                  }}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{entry.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Icon className="w-3 h-3" style={{ color: isShared ? 'var(--gold)' : 'rgba(255,255,255,0.4)' }} />
                    <span className="text-xs" style={{ color: isShared ? 'var(--gold)' : 'rgba(255,255,255,0.4)' }}>
                      {typeLabel(entry)} · {entry.duration_min} דק׳
                    </span>
                  </div>
                </div>

                {/* Wait estimate */}
                <div className="flex items-center gap-1 text-xs text-white/30 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{waitMins > 0 ? `~${waitMins} דק׳` : 'הבא!'}</span>
                </div>

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
