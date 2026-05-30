'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, Eye, BarChart3,
  Package, Cpu, Settings, Zap, ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard, section: 'main' },
  { href: '/competitor', label: 'Competitor Radar', icon: Eye, section: 'main' },
  { href: '/revenue', label: 'Revenue & Trends', icon: TrendingUp, section: 'main' },
  { href: '/forecasting', label: 'Demand Forecast', icon: BarChart3, section: 'analytics' },
  { href: '/inventory', label: 'Inventory & AI Approvals', icon: Package, section: 'analytics' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] flex-shrink-0 bg-carbon-900 border-r border-[#1E2D40] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1E2D40]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-acid-muted border border-acid/25 flex items-center justify-center">
            <Zap className="w-4 h-4 text-acid" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-primary font-display leading-none">DPE</div>
            <div className="text-[10px] text-ink-tertiary font-mono mt-0.5 leading-none">PRICING ENGINE</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="px-2 mb-3">
          <span className="label">Core Modules</span>
        </div>

        {NAV_ITEMS.filter(i => i.section === 'main').map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'nav-link group',
                isActive && 'active'
              )}
            >
              <Icon className={clsx(
                'w-4 h-4 flex-shrink-0',
                isActive ? 'text-acid' : 'text-ink-tertiary group-hover:text-ink-secondary'
              )} strokeWidth={1.75} />
              <span className="flex-1 text-[13px]">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-acid/60" />}
            </Link>
          )
        })}

        <div className="px-2 pt-4 mb-3">
          <span className="label">Analytics</span>
        </div>

        {NAV_ITEMS.filter(i => i.section === 'analytics').map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx('nav-link group', isActive && 'active')}
            >
              <Icon className={clsx(
                'w-4 h-4 flex-shrink-0',
                isActive ? 'text-acid' : 'text-ink-tertiary group-hover:text-ink-secondary'
              )} strokeWidth={1.75} />
              <span className="flex-1 text-[13px]">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-acid/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-4 border-t border-[#1E2D40]">
        <div className="flex items-center gap-2.5">
          <span className="status-dot online" />
          <div>
            <div className="text-[11px] font-mono text-acid">AI ENGINE ONLINE</div>
            <div className="text-[10px] text-ink-tertiary font-mono">v2.1.0 — Q-Learning</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
