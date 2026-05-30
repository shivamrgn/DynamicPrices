'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useMemo } from 'react'

interface CompetitorTrendChartProps {
  data: any[]
}

const COMPETITOR_COLORS: Record<string, string> = {
  amazon: '#FF9900',
  flipkart: '#2874F0',
  croma: '#B71C1C',
  reliance_digital: '#00A4E4',
  snapdeal: '#E40046',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-carbon-800 border border-[#1E2D40] rounded-lg p-3 shadow-card">
      <p className="text-[11px] font-mono text-ink-tertiary mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-ink-secondary capitalize">{entry.name}</span>
          </div>
          <span className="font-semibold" style={{ color: entry.color }}>
            ₹{entry.value?.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CompetitorTrendChart({ data }: CompetitorTrendChartProps) {
  // Generate synthetic trend data from matrix data
  const chartData = useMemo(() => {
    if (!data.length) return []
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today']
    const competitors = [...new Set(data.map(d => d.competitor_name))]
    const ourAvg = data.reduce((s, d) => s + (d.our_price || 0), 0) / (data.length || 1)

    return days.map((day, i) => {
      const row: any = { day, our_price: Math.round(ourAvg * (1 + (i - 3) * 0.003)) }
      competitors.forEach(comp => {
        const compData = data.filter(d => d.competitor_name === comp)
        const compAvg = compData.reduce((s, d) => s + (d.competitor_price || 0), 0) / (compData.length || 1)
        row[comp] = Math.round(compAvg * (1 + (i - 3) * (Math.random() * 0.01 - 0.005)))
      })
      return row
    })
  }, [data])

  const competitors = data.length ? [...new Set(data.map((d: any) => d.competitor_name))] : []

  if (!chartData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-ink-tertiary font-mono">
        No trend data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D40" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: '#546278', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#546278', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* Our price line */}
        <Line
          type="monotone"
          dataKey="our_price"
          stroke="#00F5A0"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#00F5A0' }}
          name="our_price"
        />
        {/* Competitor lines */}
        {competitors.slice(0, 4).map(comp => (
          <Line
            key={comp}
            type="monotone"
            dataKey={comp}
            stroke={COMPETITOR_COLORS[comp] || '#8896B0'}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 3 }}
            name={comp}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
