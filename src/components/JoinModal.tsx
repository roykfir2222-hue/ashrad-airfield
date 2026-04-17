'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plane, Users, User } from 'lucide-react'
import type { FlightType } from '@/types/queue'
import { cn } from '@/utils/cn'

interface JoinModalProps {
  open: boolean
  onClose: () => void
  onJoin: (name: string, modes: FlightType[], duration: number) => Promise<void>
}

const FLIGHT_OPTIONS: { value: FlightType; label: string; sublabel: string; icon: React.ElementType }[] = [
  { value: 'independent', label: 'עצמאי', sublabel: 'טיסה פרטית', icon: User },
  { value: 'shared', label: 'משותף', sublabel: '12 דקות קבוע', icon: Users },
]

export function JoinModal({ open, onClose, onJoin }: JoinModalProps) {
  const [name, setName] = useState('')
  const [selectedModes, setSelectedModes] = useState<FlightType[]>(['independent'])
  const [duration, setDuration] = useState(7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasIndependent = selectedModes.includes('independent')
  const hasShared = selectedModes.includes('shared')

  const toggleMode = (mode: FlightType) => {
    setSelectedModes(prev => {
      if (prev.includes(mode)) {
        // Don't allow deselecting if it's the only one
        if (prev.length === 1) return prev
        return prev.filter(m => m !== mode)
      }
      return [...prev, mode]
    })
  }

  const totalDuration = () => {
    let total = 0
    if (hasIndependent) total += duration
    if (hasShared) total += 12
    return total
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('נא להזין שם'); return }
    if (selectedModes.length === 0) { setError('נא לבחור סוג טיסה'); return }
    setError('')
    setLoading(true)
    try {
      await onJoin(name.trim(), selectedModes, totalDuration())
      setName('')
      setSelectedModes(['independent'])
      setDuration(7)
      onClose()
    } catch {
      setError('שגיאה בהוספה לתור')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(2,9,23,0.8)', backdropFilter: 'blur(4px)' }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-x-4 bottom-4 z-50 sm:inset-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md"
          >
            <div
              className="glass-bright rounded-3xl p-6"
              style={{ borderRadius: '28px', border: '1px solid rgba(201,168,76,0.25)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}
                  >
                    <Plane className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">הגעתי!</h2>
                    <p className="text-xs text-white/40">הצטרפות לתור</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  aria-label="סגור"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name input */}
                <div>
                  <label className="block text-sm text-white/60 mb-2 font-medium">שמך</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setError('') }}
                    placeholder="הכנס שם..."
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-base outline-none transition-all"
                    style={{
                      background: 'rgba(10,22,40,0.7)',
                      border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.12)',
                      direction: 'rtl',
                    }}
                    autoFocus
                  />
                  {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                </div>

                {/* Flight modes — multi-select */}
                <div>
                  <label className="block text-sm text-white/60 mb-2 font-medium">
                    סוג טיסה
                    <span className="text-white/30 text-xs font-normal mr-1">(ניתן לבחור שניים)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FLIGHT_OPTIONS.map(({ value, label, sublabel, icon: Icon }) => {
                      const isSelected = selectedModes.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleMode(value)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-pointer transition-all duration-200 relative',
                          )}
                          style={{
                            background: isSelected
                              ? 'rgba(201,168,76,0.18)'
                              : 'rgba(10,22,40,0.5)',
                            border: isSelected
                              ? '1.5px solid rgba(201,168,76,0.6)'
                              : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {isSelected && (
                            <span
                              className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: 'var(--gold)', color: '#0a1628' }}
                            >
                              ✓
                            </span>
                          )}
                          <Icon className="w-4 h-4" style={{ color: isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.4)' }} />
                          <span className="text-xs font-semibold" style={{ color: isSelected ? 'var(--gold-light)' : 'rgba(255,255,255,0.6)' }}>
                            {label}
                          </span>
                          <span className="text-[10px] text-white/30 text-center leading-tight">{sublabel}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Duration slider — visible when independent is selected */}
                <AnimatePresence>
                  {hasIndependent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label className="block text-sm text-white/60 mb-2 font-medium">
                        משך טיסה עצמאית: <span style={{ color: 'var(--gold-light)' }}>{duration} דקות</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/30">5</span>
                        <input
                          type="range"
                          min={5}
                          max={8}
                          value={duration}
                          onChange={e => setDuration(Number(e.target.value))}
                          className="flex-1 h-1.5 rounded-full cursor-pointer"
                          style={{ accentColor: 'var(--gold)' }}
                        />
                        <span className="text-xs text-white/30">8</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Total duration summary */}
                {selectedModes.length > 0 && (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>סה״כ זמן טיסה</span>
                    <span className="font-bold" style={{ color: 'var(--gold-light)' }}>
                      {totalDuration()} דקות
                      {selectedModes.length === 2 && (
                        <span className="text-white/30 font-normal mr-1">
                          ({duration} עצמאי + 12 משותף)
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-xl font-bold text-base cursor-pointer transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold), #a07830)',
                    color: '#0a1628',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
                  }}
                >
                  {loading ? 'מצטרף...' : 'הגעתי — הוסף לתור ✈'}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
