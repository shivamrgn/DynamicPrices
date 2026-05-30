'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { forecastingApi, productsApi } from '@/lib/api'
import { SectionHeader, Skeleton, ConfidenceBar } from '@/components/ui'
import { ForecastChart } from '@/components/charts/ForecastChart'
import { SeasonalChart } from '@/components/charts/SeasonalChart'
import { BarChart3, Calendar, ChevronDown, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

export default function ForecastingPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const queryClient = useQueryClient()

  const { data: productsData, isLoading: prodLoading } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsApi.list({ limit: 20 }),
  })

  const products = productsData?.products || []

  // Auto-select first product
  const activeProductId = selectedProductId || products[0]?.id || ''

  const { data: forecast, isLoading: forecastLoading, isFetching: forecastFetching } = useQuery({
    queryKey: ['forecast', activeProductId],
    queryFn: () => forecastingApi.getProductForecast(activeProductId, 30),
    enabled: !!activeProductId,
  })

  const { data: allForecasts, isLoading: allLoading, isFetching: allFetching } = useQuery({
    queryKey: ['all-forecasts'],
    queryFn: () => forecastingApi.getAll(8),
  })

  const forecasts: any[] = Array.isArray(allForecasts) ? allForecasts : []
  const isFetchingAny = forecastFetching || allFetching

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-semibold font-display text-ink-primary">Demand Forecasting</h1>
            <p className="text-xs text-ink-tertiary font-mono mt-0.5">
              Prophet + XGBoost ensemble · 30-day horizon · Confidence intervals shown
            </p>
          </div>
          <button
            className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 self-center"
            onClick={() => {
              if (activeProductId) {
                queryClient.invalidateQueries({ queryKey: ['forecast', activeProductId] })
              }
              queryClient.invalidateQueries({ queryKey: ['all-forecasts'] })
            }}
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isFetchingAny && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Product Selector */}
        <div className="relative">
          <select
            className="appearance-none bg-carbon-800 border border-[#1E2D40] rounded-lg px-4 py-2 pr-8 text-xs font-mono text-ink-secondary focus:outline-none focus:border-[#2A3D55] cursor-pointer"
            value={activeProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
        </div>
      </div>

      {/* Model info banner */}
      {forecast && (
        <div className="card px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-cobalt-signal" />
              <span className="text-xs font-mono text-ink-secondary">{forecast.model_used}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="label">Data Points</span>
              <span className="text-xs font-mono text-ink-primary">{forecast.data_points_used}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="label">Horizon</span>
              <span className="text-xs font-mono text-ink-primary">{forecast.forecast_horizon_days} days</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-48">
            <span className="label flex-shrink-0">Accuracy</span>
            <ConfidenceBar value={forecast.accuracy_score} />
          </div>
        </div>
      )}

      {/* Main forecast chart */}
      <div className="card p-5">
        <SectionHeader
          title={forecast?.product_name ? `Forecast: ${forecast.product_name}` : 'Demand Forecast'}
          subtitle="Shaded band = 90% confidence interval"
        />
        {forecastLoading || !activeProductId ? (
          <Skeleton className="h-72" />
        ) : (
          <ForecastChart forecasts={forecast?.forecasts || []} />
        )}
      </div>

      {/* Seasonal factors + all forecasts */}
      <div className="grid grid-cols-[360px_1fr] gap-4">
        {/* Seasonal factors */}
        <div className="card p-5">
          <SectionHeader title="Weekly Seasonality" subtitle="Demand multiplier by day" />
          {forecastLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <SeasonalChart factors={forecast?.seasonal_factors || {}} />
          )}
        </div>

        {/* All product forecasts table */}
        <div className="card p-5">
          <SectionHeader title="Forecast Overview" subtitle="7-day demand projection per product" />
          <div className="space-y-0">
            <div className="grid grid-cols-4 gap-4 pb-2 border-b border-[#1E2D40] text-[10px] font-mono text-ink-tertiary">
              <span>PRODUCT</span>
              <span className="text-center">MODEL</span>
              <span className="text-center">7-DAY DEMAND</span>
              <span className="text-right">ACCURACY</span>
            </div>
            {allLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 mt-1" />)
              : forecasts.map((f: any, idx: number) => (
                <div key={idx} className="grid grid-cols-4 gap-4 py-3 border-b border-[#0F1826] last:border-0 text-xs items-center">
                  <div>
                    <div className="font-medium text-ink-primary truncate">{f.product_name}</div>
                    <div className="text-[10px] text-ink-tertiary font-mono">{f.category}</div>
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      f.model_used.includes('XGBoost') ? 'bg-cobalt-muted text-cobalt-signal' : 'bg-amber-muted text-amber-signal'
                    }`}>
                      {f.model_used.includes('XGBoost') ? 'ENSEMBLE' : 'PROPHET'}
                    </span>
                  </div>
                  <div className="text-center font-mono text-ink-primary">
                    {f.avg_weekly_demand?.toFixed(0)} units
                  </div>
                  <div className="text-right">
                    <ConfidenceBar value={f.accuracy_score} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
