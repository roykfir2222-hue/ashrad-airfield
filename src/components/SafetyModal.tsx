'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck } from 'lucide-react'

interface SafetyModalProps {
  open: boolean
  onClose: () => void
}

export function SafetyModal({ open, onClose }: SafetyModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="safety-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(2,9,23,0.85)', backdropFilter: 'blur(4px)' }}
          />

          {/* Modal — same size/position as JoinModal */}
          <motion.div
            key="safety-modal"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 bottom-4 z-50 sm:inset-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md"
          >
            <div
              className="glass-bright rounded-3xl p-7"
              style={{
                borderRadius: '28px',
                border: '1px solid rgba(201,168,76,0.45)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              }}
            >
              {/* Top row: X button */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
                  style={{
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                  aria-label="סגור"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Shield icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 rounded-3xl flex items-center justify-center"
                  style={{
                    background: 'rgba(201,168,76,0.12)',
                    border: '2px solid rgba(201,168,76,0.45)',
                    boxShadow: '0 0 40px rgba(201,168,76,0.2)',
                  }}
                >
                  <ShieldCheck className="w-12 h-12" style={{ color: 'var(--gold)' }} />
                </motion.div>
              </div>

              {/* Main message */}
              <div className="text-center space-y-2" style={{ direction: 'rtl' }}>
                <p className="text-white font-bold text-2xl leading-snug">
                  נא לשמור על כללי הבטיחות
                </p>
                <p className="font-semibold text-xl" style={{ color: 'var(--gold-light)' }}>
                  הטסה נעימה ✈
                </p>
              </div>

              {/* Confirm button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="mt-8 w-full py-4 rounded-2xl font-bold text-base cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, var(--gold), #a07830)',
                  color: '#0a1628',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
                  borderRadius: '16px',
                }}
              >
                הבנתי — בוא נטוס!
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
