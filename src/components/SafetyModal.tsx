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
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(2,9,23,0.88)', backdropFilter: 'blur(6px)' }}
          />

          {/* Modal — slides up from bottom */}
          <motion.div
            key="safety-modal"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 1 }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:px-4"
          >
            <div
              className="glass-bright p-8 pb-10"
              style={{
                borderRadius: '32px 32px 0 0',
                border: '1px solid rgba(201,168,76,0.45)',
                borderBottom: 'none',
                boxShadow: '0 -16px 80px rgba(201,168,76,0.15), 0 -4px 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
              </div>

              {/* X button */}
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
              <div className="flex justify-center mb-7">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 22 }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(201,168,76,0.12)',
                    border: '2px solid rgba(201,168,76,0.5)',
                    boxShadow: '0 0 48px rgba(201,168,76,0.25)',
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.07, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ShieldCheck className="w-12 h-12" style={{ color: 'var(--gold)' }} />
                  </motion.div>
                </motion.div>
              </div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-3 mb-8"
                style={{ direction: 'rtl' }}
              >
                <p className="text-white font-bold leading-snug" style={{ fontSize: '1.45rem' }}>
                  נא לשמור על כללי הבטיחות
                </p>
                <p className="font-semibold text-xl" style={{ color: 'var(--gold-light)' }}>
                  הטסה נעימה ✈
                </p>
              </motion.div>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-bold text-base cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, var(--gold), #a07830)',
                  color: '#0a1628',
                  border: 'none',
                  boxShadow: '0 4px 24px rgba(201,168,76,0.4)',
                  borderRadius: '18px',
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
