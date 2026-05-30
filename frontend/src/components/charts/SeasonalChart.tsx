'use client'

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function SeasonalChart({ factors }: { factors: Record<string, number> }) {
  const data = DAYS.map((day, i) => ({
    day: DAY_LABELS[i],
    factor: factors[day] || 1.0,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
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
          domain={[0.7, 1.4]}
          tickFormatter={(v) => `${v.toFixed(1)}x`}
        />
        <Tooltip
          formatter={(v: any) => [`${v.toFixed(2)}x demand`, 'Multiplier']}
          contentStyle={{
            background: '#111520', border: '1px solid #1E2D40',
            borderRadius: 8, fontSize: 11, fontFamily: 'JetBrains Mono',
          }}
        />
        <Bar dataKey="factor" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.factor > 1.1 ? '#00F5A0' : entry.factor < 0.95 ? '#FF4D6A' : '#3B8BFF'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
