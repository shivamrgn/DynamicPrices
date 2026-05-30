'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'
import { useMemo } from 'react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-carbon-800 border border-[#1E2D40] rounded-lg p-3 shadow-card">
      <p className="text-[11px] font-mono text-ink-tertiary mb-1">{label}</p>
      <p className="text-xs font-mono text-acid font-semibold">
        Margin: {payload[0]?.value?.toFixed(2)}%
      </p>
    </div>
  )
}

export function MarginTrendChart({ data }: { data: any[] }) {
  const chartData = useMemo(() => {
    return data.map((d: any) => ({
      date: d.date,
      margin: parseFloat(
        ((d.ai_revenue - d.baseline_revenue) / d.ai_revenue * 100 + 15).toFixed(2)
      ),
    }))
  }, [data])

  const avgMargin = chartData.reduce((s, d) => s + d.margin, 0) / (chartData.length || 1)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D40" vertical={false} />
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
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          domain={['dataMin - 2', 'dataMax + 2']}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={avgMargin}
          stroke="#F5A623"
          strokeDasharray="4 2"
          strokeWidth={1}
          label={{ value: `Avg ${avgMargin.toFixed(1)}%`, fill: '#F5A623', fontSize: 10, fontFamily: 'JetBrains Mono' }}
        />
        <Line
          type="monotone"
          dataKey="margin"
          stroke="#3B8BFF"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#3B8BFF' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
