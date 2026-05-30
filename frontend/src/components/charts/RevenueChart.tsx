'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface RevenueChartProps {
  data: Array<{
    date: string
    baseline_revenue: number
    ai_revenue: number
    uplift: number
  }>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-carbon-800 border border-[#1E2D40] rounded-lg p-3 shadow-card">
      <p className="text-[11px] font-mono text-ink-tertiary mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-[11px] font-mono">
          <span className="text-ink-secondary">{entry.name === 'ai_revenue' ? 'AI Optimized' : 'Baseline'}</span>
          <span style={{ color: entry.color }} className="font-semibold">
            ₹{(entry.value / 1000).toFixed(1)}k
          </span>
        </div>
      ))}
      {payload[0] && payload[1] && (
        <div className="mt-2 pt-2 border-t border-[#1E2D40] flex items-center justify-between text-[11px] font-mono">
          <span className="text-ink-tertiary">Uplift</span>
          <span className="text-acid font-semibold">
            +{((payload[1]?.value - payload[0]?.value) / payload[0]?.value * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B8BFF" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3B8BFF" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00F5A0" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#00F5A0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1E2D40"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: '#546278', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: '#546278', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="baseline_revenue"
          stroke="#3B8BFF"
          strokeWidth={1.5}
          fill="url(#baselineGrad)"
          strokeDasharray="4 2"
          name="baseline_revenue"
          dot={false}
          activeDot={{ r: 4, fill: '#3B8BFF', strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="ai_revenue"
          stroke="#00F5A0"
          strokeWidth={2}
          fill="url(#aiGrad)"
          name="ai_revenue"
          dot={false}
          activeDot={{ r: 4, fill: '#00F5A0', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
