'use client'

import { useState, useEffect } from 'react'
import { Activity, Clock, Database, Wifi } from 'lucide-react'

export function TopBar() {
  const [time, setTime] = useState('')
  const [latency, setLatency] = useState(14)

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }))
      setLatency(Math.floor(Math.random() * 10 + 10))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="h-12 bg-carbon-900 border-b border-[#1E2D40] flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: page context + ticker */}
      <div className="flex items-center gap-6 overflow-hidden">
        <div className="ticker-container max-w-md">
          <div className="ticker-inner text-[11px] font-mono text-ink-tertiary">
            {[
              'DYSON-V15 ↑ +3.1% — Competitor stockout',
              'SONY-WH1000 → MAINTAIN — Demand stable',
              'NIKE-AIR-270 ↓ −2.4% — Overstock detected',
              'DELL-XPS13 ↑ +5.2% — Low inventory premium',
              'BOAT-AIRDOPES ↓ −1.8% — Price match trigger',
              'SAMSUNG-QLED ↑ +2.9% — Weekend demand spike',
              'DYSON-V15 ↑ +3.1% — Competitor stockout',
              'SONY-WH1000 → MAINTAIN — Demand stable',
              'NIKE-AIR-270 ↓ −2.4% — Overstock detected',
              'DELL-XPS13 ↑ +5.2% — Low inventory premium',
              'BOAT-AIRDOPES ↓ −1.8% — Price match trigger',
              'SAMSUNG-QLED ↑ +2.9% — Weekend demand spike',
            ].join('   ·   ')}
          </div>
        </div>
      </div>

      {/* Right: system indicators */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Latency */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Activity className="w-3 h-3 text-acid" />
          <span className="text-ink-tertiary">{latency}ms</span>
        </div>

        {/* DB Sync */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Database className="w-3 h-3 text-cobalt-signal" />
          <span className="text-ink-tertiary">SYNC</span>
        </div>

        {/* Network */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Wifi className="w-3 h-3 text-acid" />
          <span className="text-ink-tertiary">LIVE</span>
        </div>

        {/* Clock */}
        <div className="flex items-center gap-1.5 border-l border-[#1E2D40] pl-4">
          <Clock className="w-3 h-3 text-ink-tertiary" />
          <span className="text-[11px] font-mono text-ink-secondary">{time}</span>
        </div>
      </div>
    </header>
  )
}
