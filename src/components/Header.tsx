'use client'

import Image from 'next/image'

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 w-full glass border-b border-white/10"
      style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20">
            <Image
              src="/logo-ashrad.jpg"
              alt="מנחת אשרד"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight tracking-wide">
              מנחת אשרד
            </h1>
            <p className="text-xs" style={{ color: 'var(--gold)' }}>
              Ashrad Airfield · תור חכם
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(201,168,76,0.15)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: 'var(--gold-light)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            פעיל 24/7
          </div>
        </div>
      </div>
    </header>
  )
}
