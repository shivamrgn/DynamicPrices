'use client'

import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { competitorsApi, productsApi } from '@/lib/api'
import { SectionHeader, Skeleton } from '@/components/ui'
import { CompetitorMatrix } from '@/components/charts/CompetitorMatrix'
import { CompetitorTrendChart } from '@/components/charts/CompetitorTrendChart'
import { TrendingDown, TrendingUp, RefreshCw, AlertTriangle, Cpu, Plus, X } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const COMPETITOR_COLORS: Record<string, string> = {
  amazon: '#FF9900',
  flipkart: '#2874F0',
  croma: '#B71C1C',
  reliance_digital: '#1565C0',
  snapdeal: '#E40046',
}

export default function CompetitorPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    competitor_name: 'amazon',
    competitor_price: '',
    in_stock: true,
  })

  const { data: matrix, isLoading: matrixLoading, isFetching: matrixFetching } = useQuery({
    queryKey: ['competitor-matrix'],
    queryFn: () => competitorsApi.getMatrix(),
    refetchInterval: 120000, // 2 min
  })

  const { data: summary, isLoading: summaryLoading, isFetching: summaryFetching } = useQuery({
    queryKey: ['competitor-summary'],
    queryFn: competitorsApi.getSummary,
    refetchInterval: 120000,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsApi.list({ limit: 50 }),
  })

  const scrapeMutation = useMutation({
    mutationFn: competitorsApi.scrape,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-matrix'] })
      queryClient.invalidateQueries({ queryKey: ['competitor-summary'] })
      queryClient.invalidateQueries({ queryKey: ['rl-decisions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
      toast.success(res.message || 'Scrape cycle completed successfully')
    },
    onError: () => {
      toast.error('Scrape cycle failed')
    }
  })

  const addMutation = useMutation({
    mutationFn: (data: any) => competitorsApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-matrix'] })
      queryClient.invalidateQueries({ queryKey: ['competitor-summary'] })
      queryClient.invalidateQueries({ queryKey: ['rl-decisions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
      toast.success('Competitor price point added successfully. AI price recommendation updated.')
      setIsModalOpen(false)
      setFormData({
        product_id: '',
        competitor_name: 'amazon',
        competitor_price: '',
        in_stock: true,
      })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add price point')
    }
  })

  const products = productsData?.products || []
  const summaryList: any[] = Array.isArray(summary) ? summary : []
  const matrixData: any[] = matrix?.data || []

  // Group by product
  const byProduct: Record<string, any[]> = {}
  matrixData.forEach((row) => {
    const key = row.product_id
    if (!byProduct[key]) byProduct[key] = []
    byProduct[key].push(row)
  })

  const undercut = matrixData.filter((r) => r.price_delta < 0).length
  const overpriced = matrixData.filter((r) => r.price_delta > 0).length

  const isFetchingAny = matrixFetching || summaryFetching

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.product_id || !formData.competitor_price) {
      toast.error('Please fill in all fields')
      return
    }
    addMutation.mutate({
      product_id: formData.product_id,
      competitor_name: formData.competitor_name,
      competitor_price: parseFloat(formData.competitor_price),
      in_stock: formData.in_stock,
    })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-display text-ink-primary">Competitor Radar</h1>
          <p className="text-xs text-ink-tertiary font-mono mt-0.5">
            Scraper cycle: every 2 hours · {matrixData.length} price points tracked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Price Point</span>
          </button>
          
          <button
            className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 border border-[#1E2D40] text-ink-secondary hover:text-ink-primary"
            onClick={() => scrapeMutation.mutate()}
            disabled={scrapeMutation.isPending}
          >
            {scrapeMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-acid" />
            )}
            <span>{scrapeMutation.isPending ? 'Scraping...' : 'Trigger Scrape'}</span>
          </button>

          <button
            className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['competitor-matrix'] })
              queryClient.invalidateQueries({ queryKey: ['competitor-summary'] })
            }}
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isFetchingAny && "animate-spin")} />
            <span>Refresh Radar</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {summaryLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : summaryList.map((comp) => (
            <CompetitorCard
              key={comp.competitor_name}
              competitor={comp}
              color={COMPETITOR_COLORS[comp.competitor_name] || '#8896B0'}
            />
          ))
        }
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-crimson-muted">
            <TrendingDown className="w-5 h-5 text-crimson-signal" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-crimson-signal">{undercut}</div>
            <div className="text-xs text-ink-tertiary font-mono mt-0.5">Items competitors beat us on</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-acid-muted">
            <TrendingUp className="w-5 h-5 text-acid" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-acid">{overpriced}</div>
            <div className="text-xs text-ink-tertiary font-mono mt-0.5">{"Items we're priced above them"}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-amber-muted">
            <AlertTriangle className="w-5 h-5 text-amber-signal" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-amber-signal">
              {matrixData.filter(r => !r.in_stock).length}
            </div>
            <div className="text-xs text-ink-tertiary font-mono mt-0.5">Competitor stockouts (opportunity)</div>
          </div>
        </div>
      </div>

      {/* Pricing Matrix */}
      <div className="card p-5">
        <SectionHeader
          title="Live Pricing Matrix"
          subtitle="Green = we're cheaper · Red = competitor is cheaper"
        />
        {matrixLoading ? (
          <Skeleton className="h-80" />
        ) : (
          <CompetitorMatrix data={matrixData} />
        )}
      </div>

      {/* Trend chart placeholder */}
      <div className="card p-5">
        <SectionHeader
          title="7-Day Price Trend"
          subtitle="Our price vs. competitor average over time"
        />
        <CompetitorTrendChart data={matrixData} />
      </div>

      {/* Add Price Point Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-carbon-950/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-glow-acid border-[#2A3D55]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold font-display text-ink-primary">Add Competitor Price Point</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-ink-tertiary hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Select SKU / Product</label>
                <select
                  required
                  className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                  value={formData.product_id}
                  onChange={e => setFormData(s => ({ ...s, product_id: e.target.value }))}
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1.5">Competitor</label>
                  <select
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={formData.competitor_name}
                    onChange={e => setFormData(s => ({ ...s, competitor_name: e.target.value }))}
                  >
                    {Object.keys(COMPETITOR_COLORS).map(name => (
                      <option key={name} value={name}>{name.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label block mb-1.5">Price (INR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 24999"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={formData.competitor_price}
                    onChange={e => setFormData(s => ({ ...s, competitor_price: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="in_stock"
                  checked={formData.in_stock}
                  onChange={e => setFormData(s => ({ ...s, in_stock: e.target.checked }))}
                  className="rounded border-[#1E2D40] bg-carbon-850 text-acid focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <label htmlFor="in_stock" className="text-xs text-ink-secondary cursor-pointer">Competitor has stock</label>
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center text-xs py-2"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {addMutation.isPending ? 'Saving...' : 'Add Price Point'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function CompetitorCard({ competitor, color }: { competitor: any; color: string }) {
  const delta = competitor.avg_delta_pct || 0
  const isAbove = delta > 0

  return (
    <div className="card p-4 hover:border-[#2A3D55] transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-semibold text-ink-primary capitalize font-display truncate">
          {competitor.competitor_name}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-ink-tertiary">Avg Price</span>
          <span className="text-ink-secondary">₹{competitor.avg_price?.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-ink-tertiary">vs Ours</span>
          <span className={isAbove ? 'text-acid' : 'text-crimson-signal'}>
            {isAbove ? '+' : ''}{delta?.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-ink-tertiary">SKUs</span>
          <span className="text-ink-secondary">{competitor.products_tracked}</span>
        </div>
      </div>
    </div>
  )
}
