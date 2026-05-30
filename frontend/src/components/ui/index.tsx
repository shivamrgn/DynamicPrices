import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ReactNode } from 'react'

// ─── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  accent?: 'acid' | 'amber' | 'crimson' | 'cobalt'
  icon?: ReactNode
}

export function MetricCard({
  label, value, subtext, trend, trendValue, accent = 'acid', icon
}: MetricCardProps) {
  const accentClasses = {
    acid: 'text-acid',
    amber: 'text-amber-signal',
    crimson: 'text-crimson-signal',
    cobalt: 'text-cobalt-signal',
  }

  const trendIcon = trend === 'up'
    ? <TrendingUp className="w-3 h-3" />
    : trend === 'down'
      ? <TrendingDown className="w-3 h-3" />
      : <Minus className="w-3 h-3" />

  const trendColor = trend === 'up' ? 'text-acid' : trend === 'down' ? 'text-crimson-signal' : 'text-ink-tertiary'

  return (
    <div className="card p-5 hover:border-[#2A3D55] transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className="label">{label}</span>
        {icon && (
          <div className={clsx('p-1.5 rounded-md', `bg-${accent === 'acid' ? 'acid' : accent}-muted`)}>
            <span className={clsx('w-3.5 h-3.5', accentClasses[accent])}>
              {icon}
            </span>
          </div>
        )}
      </div>
      <div className={clsx('font-mono text-[1.75rem] leading-none font-bold mb-2', accentClasses[accent])}>
        {value}
      </div>
      {(subtext || trendValue) && (
        <div className="flex items-center justify-between mt-2">
          {subtext && <span className="text-xs text-ink-tertiary font-mono">{subtext}</span>}
          {trendValue && (
            <div className={clsx('flex items-center gap-1 text-xs font-mono', trendColor)}>
              {trendIcon}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ActionBadge ──────────────────────────────────────────────────────────────
interface ActionBadgeProps {
  action: 'increase' | 'decrease' | 'maintain'
  size?: 'sm' | 'md'
}

export function ActionBadge({ action, size = 'sm' }: ActionBadgeProps) {
  const configs = {
    increase: { label: '↑ INCREASE', className: 'badge-acid' },
    decrease: { label: '↓ DECREASE', className: 'badge-crimson' },
    maintain: { label: '→ MAINTAIN', className: 'badge-amber' },
  }
  const { label, className } = configs[action]
  return <span className={clsx(className, size === 'md' && 'px-3 py-1.5 text-sm')}>{label}</span>
}

// ─── AlertLevel ───────────────────────────────────────────────────────────────
interface AlertLevelProps {
  level: 'critical' | 'warning' | 'ok'
}

export function AlertLevel({ level }: AlertLevelProps) {
  const configs = {
    critical: { label: 'CRITICAL', className: 'badge-crimson' },
    warning: { label: 'WARNING', className: 'badge-amber' },
    ok: { label: 'HEALTHY', className: 'badge-acid' },
  }
  const { label, className } = configs[level]
  return <span className={className}>{label}</span>
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx(
      'animate-pulse rounded-lg bg-carbon-700',
      className
    )} />
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-base font-semibold text-ink-primary font-display">{title}</h2>
        {subtitle && <p className="text-xs text-ink-tertiary mt-0.5 font-mono">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── ConfidenceBar ────────────────────────────────────────────────────────────
export function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'bg-acid' : pct >= 70 ? 'bg-amber-signal' : 'bg-crimson-signal'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-carbon-600 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-ink-secondary w-10 text-right">{pct}%</span>
      {label && <span className="text-xs text-ink-tertiary">{label}</span>}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ message, subtext }: { message: string; subtext?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-carbon-700 flex items-center justify-center mb-4">
        <div className="w-5 h-5 rounded-full bg-carbon-600" />
      </div>
      <p className="text-sm text-ink-secondary font-medium">{message}</p>
      {subtext && <p className="text-xs text-ink-tertiary mt-1">{subtext}</p>}
    </div>
  )
}

// ─── Price Display ────────────────────────────────────────────────────────────
export function PriceDisplay({
  price, currency = '₹', size = 'md', highlight = false
}: {
  price: number; currency?: string; size?: 'sm' | 'md' | 'lg'; highlight?: boolean
}) {
  const sizeClass = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'
  return (
    <span className={clsx(
      'font-mono font-semibold',
      sizeClass,
      highlight ? 'text-acid' : 'text-ink-primary'
    )}>
      {currency}{price?.toLocaleString('en-IN')}
    </span>
  )
}
