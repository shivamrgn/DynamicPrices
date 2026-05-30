'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'

const ForecastTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const predicted = payload.find((p: any) => p.dataKey === 'predicted_demand')
  const lower = payload.find((p: any) => p.dataKey === 'lower_bound')
  const upper = payload.find((p: any) => p.dataKey === 'upper_bound')

  return (
    <div className="bg-carbon-800 border border-[#1E2D40] rounded-lg p-3 shadow-card">
      <p className="text-[11px] font-mono text-ink-tertiary mb-2">{label}</p>
      {predicted && (
        <div className="text-xs font-mono text-acid font-semibold">
          Forecast: {predicted.value?.toFixed(1)} units
        </div>
      )}
      {lower && upper && (
        <div className="text-[10px] font-mono text-ink-tertiary mt-1">
          90% CI: [{lower.value?.toFixed(1)} — {upper.value?.toFixed(1)}]
        </div>
      )}
    </div>
  )
}

export function ForecastChart({ forecasts }: { forecasts: any[] }) {
  if (!forecasts.length) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-ink-tertiary font-mono">
        Select a product to view forecast
      </div>
    )
  }

  const data = forecasts.map((f: any) => ({
    date: f.date?.slice(5),
    predicted_demand: f.predicted_demand,
    lower_bound: f.lower_bound,
    upper_bound: f.upper_bound,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B8BFF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B8BFF" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B8BFF" stopOpacity={0.08} />
            <stop offset="95%" stopColor="#3B8BFF" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        />
        <Tooltip content={<ForecastTooltip />} />
        {/* CI band */}
        <Area type="monotone" dataKey="upper_bound" stroke="none" fill="url(#ciGrad)" />
        <Area type="monotone" dataKey="lower_bound" stroke="none" fill="white" fillOpacity={0.01} />
        {/* Prediction line */}
        <Area
          type="monotone"
          dataKey="predicted_demand"
          stroke="#3B8BFF"
          strokeWidth={2}
          fill="url(#forecastGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#3B8BFF' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}


// Seasonal factors bar chart
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
