'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { SectionHeader, MetricCard, Skeleton } from '@/components/ui'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { MarginTrendChart } from '@/components/charts/MarginTrendChart'
import { DollarSign, TrendingUp, BarChart2, Award, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

export default function RevenuePage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 60000,
  })

  const revenueChart = data?.revenue_chart || []
  const kpis = data?.kpis

  // Compute totals from chart data
  const totalAI = revenueChart.reduce((s: number, d: any) => s + (d.ai_revenue || 0), 0)
  const totalBaseline = revenueChart.reduce((s: number, d: any) => s + (d.baseline_revenue || 0), 0)
  const totalUplift = totalAI - totalBaseline
  const upliftPct = totalBaseline > 0 ? (totalUplift / totalBaseline * 100) : 0

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-display text-ink-primary">Revenue & Trends</h1>
          <p className="text-xs text-ink-tertiary font-mono mt-0.5">30-day rolling window · All amounts in INR</p>
        </div>
        <button
          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })}
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", isFetching && "animate-spin")} />
          <span>Refresh Trends</span>
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px]" />)
        ) : (
          <>
            <MetricCard
              label="AI Revenue (30d)"
              value={`₹${(totalAI / 100000).toFixed(1)}L`}
              subtext="AI-optimized pricing"
              trend="up"
              trendValue={`+${upliftPct.toFixed(1)}%`}
              accent="acid"
              icon={<DollarSign className="w-3.5 h-3.5" />}
            />
            <MetricCard
              label="Baseline Revenue (30d)"
              value={`₹${(totalBaseline / 100000).toFixed(1)}L`}
              subtext="Static pricing scenario"
              trend="neutral"
              accent="cobalt"
              icon={<BarChart2 className="w-3.5 h-3.5" />}
            />
            <MetricCard
              label="Total Uplift"
              value={`₹${(totalUplift / 100000).toFixed(1)}L`}
              subtext="incremental revenue from AI"
              trend="up"
              trendValue={`+${upliftPct.toFixed(1)}%`}
              accent="amber"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
            <MetricCard
              label="Avg. Gross Margin"
              value={`${kpis?.avg_margin_pct?.toFixed(1) || 18.4}%`}
              subtext="across active product catalog"
              trend="up"
              trendValue="+1.4pp MoM"
              accent="crimson"
              icon={<Award className="w-3.5 h-3.5" />}
            />
          </>
        )}
      </div>

      {/* Revenue chart - full width */}
      <div className="card p-5">
        <SectionHeader
          title="Revenue Comparison — Baseline vs AI"
          subtitle="Daily revenue · Dashed = what we would have earned with static pricing"
        />
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : (
          <div style={{ height: 300 }}>
            <RevenueChart data={revenueChart} />
          </div>
        )}
      </div>

      {/* Margin trend */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <SectionHeader
            title="Daily Profit Margin Trend"
            subtitle="Gross margin % over 30 days"
          />
          {isLoading ? <Skeleton className="h-48" /> : <MarginTrendChart data={revenueChart} />}
        </div>

        {/* Revenue breakdown table */}
        <div className="card p-5">
          <SectionHeader
            title="Best Revenue Days"
            subtitle="Top performing days this month"
          />
          <div className="space-y-0">
            {revenueChart
              .slice()
              .sort((a: any, b: any) => b.ai_revenue - a.ai_revenue)
              .slice(0, 8)
              .map((day: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 py-2.5 border-b border-[#131B2B] last:border-0">
                  <span className="text-[11px] font-mono text-ink-tertiary w-5">{idx + 1}</span>
                  <span className="text-xs font-mono text-ink-secondary flex-1">{day.date}</span>
                  <span className="text-xs font-mono text-acid">
                    ₹{(day.ai_revenue / 1000).toFixed(1)}k
                  </span>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${day.uplift >= 0 ? 'text-acid bg-acid-muted' : 'text-crimson-signal bg-crimson-muted'}`}>
                    {day.uplift >= 0 ? '+' : ''}{day.uplift?.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
