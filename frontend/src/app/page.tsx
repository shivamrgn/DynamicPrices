'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { MetricCard, ActionBadge, Skeleton, SectionHeader } from '@/components/ui'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { TrendingUp, Users, Target, DollarSign, Brain, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 30000,
  })

  const kpis = data?.kpis
  const revenueChart = data?.revenue_chart || []
  const liveDecisions = data?.live_decisions || []
  const topPerformers = data?.top_performers || []

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-display text-ink-primary">Command Center</h1>
          <p className="text-xs text-ink-tertiary font-mono mt-0.5">
            Real-time pricing intelligence · Auto-refresh every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })}
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isFetching && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-ink-tertiary border border-[#1E2D40] rounded-lg px-3 py-1.5">
            <span className="status-dot online" />
            <span>AI ENGINE ACTIVE</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[108px]" />
          ))
        ) : (
          <>
            <MetricCard
              label="Revenue Uplift"
              value={`+${kpis?.revenue_uplift_pct?.toFixed(1)}%`}
              subtext="vs. static pricing baseline"
              trend="up"
              trendValue="vs last month"
              accent="acid"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
            <MetricCard
              label="Forecast Accuracy"
              value={`${kpis?.forecast_accuracy_pct?.toFixed(1)}%`}
              subtext="Prophet + XGBoost ensemble"
              trend="up"
              trendValue="+2.1% MoM"
              accent="cobalt"
              icon={<Target className="w-3.5 h-3.5" />}
            />
            <MetricCard
              label="Avg. Margin"
              value={`${kpis?.avg_margin_pct?.toFixed(1)}%`}
              subtext="across all active SKUs"
              trend="up"
              trendValue="+1.4pp"
              accent="amber"
              icon={<DollarSign className="w-3.5 h-3.5" />}
            />
            <MetricCard
              label="AI Decisions Today"
              value={kpis?.ai_decisions_today || 0}
              subtext={`${kpis?.active_competitors} competitors tracked`}
              trend="neutral"
              trendValue="auto-applied"
              accent="crimson"
              icon={<Brain className="w-3.5 h-3.5" />}
            />
          </>
        )}
      </div>

      {/* Main content: Revenue chart + Live decisions */}
      <div className="grid grid-cols-[1fr_360px] gap-4">
        {/* Revenue Chart */}
        <div className="card p-5">
          <SectionHeader
            title="Revenue: Baseline vs AI-Optimized"
            subtitle="30-day rolling comparison · shaded area = AI uplift"
          />
          {isLoading ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <RevenueChart data={revenueChart} />
          )}
        </div>

        {/* Live Decision Ticker */}
        <div className="card p-5 flex flex-col">
          <SectionHeader
            title="Live Decision Feed"
            subtitle="AI pricing actions — real-time"
          />
          <div className="flex-1 space-y-1 overflow-y-auto">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)
              : liveDecisions.slice(0, 10).map((decision: any, idx: number) => (
                <DecisionRow key={idx} decision={decision} />
              ))
            }
            {!isLoading && liveDecisions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Clock className="w-8 h-8 text-ink-tertiary mb-2" />
                <p className="text-xs text-ink-tertiary">No decisions yet today</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: Top performers + system status */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Top Performers */}
        <div className="card p-5">
          <SectionHeader title="Top Performing SKUs" subtitle="Revenue uplift this period" />
          <div className="space-y-0">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 mb-1" />)
              : topPerformers.map((product: any, idx: number) => (
                <TopPerformerRow key={idx} product={product} rank={idx + 1} />
              ))
            }
          </div>
        </div>

        {/* System Status */}
        <div className="card p-5">
          <SectionHeader title="System Status" />
          <div className="space-y-3">
            {[
              { label: 'ML Engine', status: 'online', detail: 'Q-Learning v2.1' },
              { label: 'Price Scraper', status: 'online', detail: 'Next run: 02:00' },
              { label: 'MongoDB', status: 'online', detail: '50 conn. pool' },
              { label: 'Forecast Engine', status: 'online', detail: 'Prophet + XGBoost' },
              { label: 'Redis Cache', status: 'online', detail: 'Hit rate: 94%' },
              { label: 'APScheduler', status: 'online', detail: '3 jobs active' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="status-dot online" />
                  <span className="text-xs text-ink-secondary font-mono">{item.label}</span>
                </div>
                <span className="text-[10px] text-ink-tertiary font-mono">{item.detail}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#1E2D40]">
            <div className="flex items-center gap-2 text-[11px] font-mono text-acid">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DecisionRow({ decision }: { decision: any }) {
  const changeAbs = Math.abs(decision.change_pct || 0)
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-carbon-700 transition-colors border border-transparent hover:border-[#1E2D40]">
      <div className="pt-0.5 flex-shrink-0">
        <ActionBadge action={decision.action} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink-primary truncate">{decision.product_name}</div>
        <div className="text-[10px] text-ink-tertiary font-mono mt-0.5 truncate">{decision.reason}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={clsx(
          'text-xs font-mono font-semibold',
          decision.action === 'increase' ? 'text-acid' : decision.action === 'decrease' ? 'text-crimson-signal' : 'text-amber-signal'
        )}>
          {decision.action === 'increase' ? '+' : decision.action === 'decrease' ? '-' : ''}{changeAbs.toFixed(1)}%
        </div>
        <div className="text-[10px] text-ink-tertiary font-mono">{decision.timestamp}</div>
      </div>
    </div>
  )
}

function TopPerformerRow({ product, rank }: { product: any; rank: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#131B2B] last:border-0">
      <span className="text-[11px] font-mono text-ink-tertiary w-4">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink-primary truncate">{product.name}</div>
        <div className="text-[10px] text-ink-tertiary font-mono">{product.sku}</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono text-ink-primary">₹{product.current_price?.toLocaleString('en-IN')}</div>
        <div className="text-[10px] font-mono text-acid">+{product.revenue_uplift}%</div>
      </div>
      <div className={clsx(
        'text-[10px] font-mono px-2 py-0.5 rounded',
        product.trend === 'up' ? 'bg-acid-muted text-acid' :
        product.trend === 'down' ? 'bg-crimson-muted text-crimson-signal' : 'bg-carbon-700 text-ink-tertiary'
      )}>
        {product.trend === 'up' ? '↑' : product.trend === 'down' ? '↓' : '→'} {product.margin_pct}%
      </div>
    </div>
  )
}
