'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, rlApi, productsApi } from '@/lib/api'
import { SectionHeader, AlertLevel, ActionBadge, Skeleton, ConfidenceBar, PriceDisplay } from '@/components/ui'
import { Package, CheckCircle, XCircle, Zap, AlertTriangle, Sliders, RefreshCw, Plus, X, Search } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const [simulatorProductId, setSimulatorProductId] = useState('')
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [productFormData, setProductFormData] = useState({
    sku: '',
    name: '',
    category: 'electronics',
    brand: '',
    current_price: '',
    cost_price: '',
    min_price: '',
    max_price: '',
    stock_quantity: '',
  })
  const [simInputs, setSimInputs] = useState({
    competitor_price: 45000,
    inventory_level: 50,
    demand_multiplier: 1.0,
  })
  const [simResult, setSimResult] = useState<any>(null)
  const [simLoading, setSimLoading] = useState(false)

  const queryClient = useQueryClient()

  const { data: inventoryData, isLoading: inventoryLoading, isFetching: inventoryFetching } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: inventoryApi.getAlerts,
    refetchInterval: 60000,
  })

  const { data: decisions, isLoading: decisionsLoading, isFetching: decisionsFetching } = useQuery({
    queryKey: ['rl-decisions'],
    queryFn: () => rlApi.getDecisions(15),
    refetchInterval: 30000,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsApi.list({ limit: 100 }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, overridePrice }: { id: string; overridePrice?: number }) =>
      rlApi.approveDecision(id, overridePrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rl-decisions'] })
      queryClient.invalidateQueries({ queryKey: ['products-list'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
      toast.success('Pricing decision applied successfully')
    },
    onError: () => toast.error('Failed to apply decision'),
  })

  const addProductMutation = useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
      toast.success('Product created successfully')
      setIsProductModalOpen(false)
      setProductFormData({
        sku: '',
        name: '',
        category: 'electronics',
        brand: '',
        current_price: '',
        cost_price: '',
        min_price: '',
        max_price: '',
        stock_quantity: '',
      })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create product')
    }
  })

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { sku, name, category, brand, current_price, cost_price, min_price, max_price, stock_quantity } = productFormData
    if (!sku || !name || !brand || !current_price || !cost_price || !min_price || !max_price || !stock_quantity) {
      toast.error('Please fill in all fields')
      return
    }
    addProductMutation.mutate({
      sku,
      name,
      category,
      brand,
      current_price: parseFloat(current_price),
      cost_price: parseFloat(cost_price),
      min_price: parseFloat(min_price),
      max_price: parseFloat(max_price),
      stock_quantity: parseInt(stock_quantity),
    })
  }

  const alerts: any[] = inventoryData?.alerts || []
  const decisionsList: any[] = Array.isArray(decisions) ? decisions : []
  const products = productsData?.products || []

  const filteredProducts = products.filter((p: any) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const activeSimProduct = simulatorProductId || products[0]?.id || ''

  async function runSimulation() {
    if (!activeSimProduct) return
    setSimLoading(true)
    try {
      const result = await rlApi.simulate({ product_id: activeSimProduct, ...simInputs })
      setSimResult(result)
    } catch (e) {
      toast.error('Simulation failed')
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-display text-ink-primary">Inventory & AI Approvals</h1>
          <p className="text-xs text-ink-tertiary font-mono mt-0.5">
            Stock intelligence · One-click AI price approvals · Q-Learning sandbox
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
          onClick={() => setIsProductModalOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: inventoryData?.total_products || '—', icon: Package, color: 'cobalt' },
          { label: 'Critical Alerts', value: inventoryData?.critical_alerts || 0, icon: AlertTriangle, color: 'crimson' },
          { label: 'Warnings', value: inventoryData?.warning_alerts || 0, icon: AlertTriangle, color: 'amber' },
          { label: 'Healthy Stock', value: inventoryData?.healthy_stock || 0, icon: CheckCircle, color: 'acid' },
        ].map((stat) => {
          const Icon = stat.icon
          const colors: Record<string, string> = {
            cobalt: 'text-cobalt-signal bg-cobalt-muted',
            crimson: 'text-crimson-signal bg-crimson-muted',
            amber: 'text-amber-signal bg-amber-muted',
            acid: 'text-acid bg-acid-muted',
          }
          return (
            <div key={stat.label} className="card p-4 flex items-center gap-3">
              <div className={clsx('p-2 rounded-lg flex-shrink-0', colors[stat.color])}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-mono font-bold text-ink-primary">{stat.value}</div>
                <div className="text-[10px] text-ink-tertiary font-mono mt-0.5">{stat.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main split: alerts left, decisions right */}
      <div className="grid grid-cols-[1fr_420px] gap-4">
        {/* Inventory Alerts */}
        <div className="card p-5">
          <SectionHeader
            title="Stock Level Alerts"
            subtitle="Critical items sorted by urgency"
            action={
              <button
                className="btn-ghost text-xs p-1.5"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })}
              >
                <RefreshCw className={clsx("w-3 h-3", inventoryFetching && "animate-spin")} />
              </button>
            }
          />
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {inventoryLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
              : alerts.filter(a => a.alert_level !== 'ok').slice(0, 12).map((alert: any) => (
                <AlertRow key={alert.product_id} alert={alert} />
              ))
            }
            {!inventoryLoading && alerts.filter(a => a.alert_level !== 'ok').length === 0 && (
              <div className="py-12 text-center">
                <CheckCircle className="w-8 h-8 text-acid mx-auto mb-2" />
                <p className="text-sm text-ink-secondary">All stock levels healthy</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Approval Queue */}
        <div className="card p-5 flex flex-col">
          <SectionHeader
            title="AI Approval Queue"
            subtitle={`${decisionsList.length} decisions pending`}
            action={
              <button
                className="btn-ghost text-xs p-1.5"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['rl-decisions'] })}
              >
                <RefreshCw className={clsx("w-3 h-3", decisionsFetching && "animate-spin")} />
              </button>
            }
          />
          <div className="flex-1 space-y-2 overflow-y-auto max-h-80">
            {decisionsLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
              : decisionsList.slice(0, 8).map((decision: any) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  onApprove={() => approveMutation.mutate({ id: decision.id })}
                  loading={approveMutation.isPending}
                />
              ))
            }
            {!decisionsLoading && decisionsList.length === 0 && (
              <div className="py-8 text-center">
                <Zap className="w-7 h-7 text-ink-tertiary mx-auto mb-2" />
                <p className="text-xs text-ink-tertiary">No pending decisions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Catalog & Inventory List */}
      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-semibold font-display text-ink-primary">Product Catalog Inventory</h2>
            <p className="text-xs text-ink-tertiary font-mono">Manage and track your active product listings</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-tertiary">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search SKU, brand or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-carbon-700 border border-[#1E2D40] rounded-lg text-xs text-ink-secondary focus:outline-none focus:border-acid/40 w-48 md:w-64 placeholder-ink-muted"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-tertiary hover:text-ink-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-carbon-700 border border-[#1E2D40] rounded-lg px-3 py-1.5 text-xs text-ink-secondary focus:outline-none focus:border-acid/40"
            >
              <option value="all">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="appliances">Appliances</option>
              <option value="clothing">Clothing</option>
              <option value="home">Home & Living</option>
              <option value="sports">Sports</option>
            </select>
          </div>
        </div>

        {/* Table container */}
        <div className="overflow-x-auto border border-[#1E2D40] rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-carbon-750 border-b border-[#1E2D40] text-[10px] uppercase font-mono tracking-wider text-ink-tertiary">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-right">Current Price</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Min / Max Range</th>
                <th className="py-3 px-4 text-right font-mono">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D40] text-xs font-mono text-ink-secondary">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p: any) => {
                  const isLowStock = p.stock_quantity < 15
                  const isCriticalStock = p.stock_quantity < 10
                  return (
                    <tr key={p.id} className="hover:bg-carbon-700/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink-primary">{p.sku}</td>
                      <td className="py-3 px-4 text-ink-primary font-sans text-xs truncate max-w-xs">{p.name}</td>
                      <td className="py-3 px-4">{p.brand}</td>
                      <td className="py-3 px-4">
                        <span className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold font-mono border',
                          p.category === 'electronics' ? 'bg-cobalt-muted text-cobalt-signal border-cobalt-signal/15' :
                          p.category === 'appliances' ? 'bg-acid-muted text-acid border-acid/15' :
                          p.category === 'clothing' ? 'bg-crimson-muted text-crimson-signal border-crimson-signal/15' :
                          'bg-carbon-700 text-ink-tertiary border-transparent'
                        )}>
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={clsx(
                          'font-bold',
                          isCriticalStock ? 'text-crimson-signal' : isLowStock ? 'text-amber-signal' : 'text-acid'
                        )}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-ink-primary font-bold">
                        ₹{p.current_price?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-ink-tertiary">
                        ₹{p.cost_price?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-ink-tertiary text-[11px] whitespace-nowrap">
                        ₹{p.min_price?.toLocaleString('en-IN')} - ₹{p.max_price?.toLocaleString('en-IN')}
                      </td>
                      <td className={clsx(
                        'py-3 px-4 text-right font-bold',
                        p.margin_pct > 25 ? 'text-acid' : p.margin_pct > 15 ? 'text-ink-primary' : 'text-crimson-signal'
                      )}>
                        {p.margin_pct}%
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-tertiary">
                    No products found matching filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Q-Learning Sandbox */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-acid-muted">
            <Sliders className="w-4 h-4 text-acid" />
          </div>
          <div>
            <h2 className="text-sm font-semibold font-display text-ink-primary">Q-Learning Sandbox</h2>
            <p className="text-xs text-ink-tertiary font-mono">Simulate market conditions and see how the RL agent responds</p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-8">
          {/* Controls */}
          <div className="space-y-6">
            {/* Product selector */}
            <div>
              <label className="label block mb-2">Target Product</label>
              <select
                className="w-full bg-carbon-700 border border-[#1E2D40] rounded-lg px-3 py-2 text-sm font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                value={activeSimProduct}
                onChange={e => setSimulatorProductId(e.target.value)}
              >
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} — ₹{p.current_price?.toLocaleString('en-IN')}</option>
                ))}
              </select>
            </div>

            {/* Sliders */}
            <SimSlider
              label="Competitor Price (₹)"
              value={simInputs.competitor_price}
              min={5000} max={200000} step={500}
              display={`₹${simInputs.competitor_price.toLocaleString('en-IN')}`}
              onChange={v => setSimInputs(s => ({ ...s, competitor_price: v }))}
            />
            <SimSlider
              label="Current Inventory Level (units)"
              value={simInputs.inventory_level}
              min={0} max={500} step={5}
              display={`${simInputs.inventory_level} units`}
              onChange={v => setSimInputs(s => ({ ...s, inventory_level: v }))}
            />
            <SimSlider
              label="Demand Multiplier"
              value={simInputs.demand_multiplier}
              min={0.1} max={5.0} step={0.1}
              display={`${simInputs.demand_multiplier.toFixed(1)}x`}
              onChange={v => setSimInputs(s => ({ ...s, demand_multiplier: v }))}
            />

            <button
              className="btn-primary w-full justify-center"
              onClick={runSimulation}
              disabled={simLoading}
            >
              {simLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {simLoading ? 'Computing...' : 'Run Simulation'}
            </button>
          </div>

          {/* Result panel */}
          <div className="bg-carbon-700 border border-[#1E2D40] rounded-xl p-5">
            {simResult ? (
              <SimResult result={simResult} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-acid-muted border border-acid/20 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-acid" />
                </div>
                <p className="text-sm text-ink-secondary font-medium">Adjust parameters and run</p>
                <p className="text-xs text-ink-tertiary mt-1">The RL agent will compute the optimal price</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-carbon-950/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-glow-acid border-[#2A3D55]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold font-display text-ink-primary">Add New Product to Inventory</h2>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="text-ink-tertiary hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1.5">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SONY-WH1000"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.sku}
                    onChange={e => setProductFormData(s => ({ ...s, sku: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label block mb-1.5">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sony WH-1000XM5"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.name}
                    onChange={e => setProductFormData(s => ({ ...s, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1.5">Brand</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sony"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.brand}
                    onChange={e => setProductFormData(s => ({ ...s, brand: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label block mb-1.5">Category</label>
                  <select
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.category}
                    onChange={e => setProductFormData(s => ({ ...s, category: e.target.value }))}
                  >
                    <option value="electronics">Electronics</option>
                    <option value="appliances">Appliances</option>
                    <option value="clothing">Clothing</option>
                    <option value="home">Home & Living</option>
                    <option value="sports">Sports</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="label block mb-1.5">Current Price</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="26999"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-2 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.current_price}
                    onChange={e => setProductFormData(s => ({ ...s, current_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label block mb-1.5">Cost Price</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="18000"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-2 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.cost_price}
                    onChange={e => setProductFormData(s => ({ ...s, cost_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label block mb-1.5">Min Price</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="20000"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-2 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.min_price}
                    onChange={e => setProductFormData(s => ({ ...s, min_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label block mb-1.5">Max Price</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="32000"
                    className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-2 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                    value={productFormData.max_price}
                    onChange={e => setProductFormData(s => ({ ...s, max_price: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label block mb-1.5">Stock Quantity</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="150"
                  className="w-full bg-carbon-800 border border-[#1E2D40] rounded-lg px-3 py-2 text-xs font-mono text-ink-secondary focus:outline-none focus:border-acid/40"
                  value={productFormData.stock_quantity}
                  onChange={e => setProductFormData(s => ({ ...s, stock_quantity: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center text-xs py-2"
                disabled={addProductMutation.isPending}
              >
                {addProductMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {addProductMutation.isPending ? 'Creating...' : 'Create & Add to Inventory'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: any }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-[#1E2D40] hover:border-[#2A3D55] transition-colors">
      <AlertLevel level={alert.alert_level} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink-primary truncate">{alert.product_name}</div>
        <div className="text-[10px] text-ink-tertiary font-mono mt-0.5">{alert.recommended_action}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs font-mono text-ink-secondary">{alert.current_stock} units</div>
        <div className="text-[10px] font-mono text-ink-tertiary">{alert.days_of_stock?.toFixed(0)}d stock</div>
      </div>
      {alert.ai_price_recommendation && (
        <div className="flex-shrink-0 text-right">
          <div className="text-[10px] text-ink-tertiary font-mono">AI Price</div>
          <div className="text-xs font-mono text-acid">₹{alert.ai_price_recommendation?.toLocaleString('en-IN')}</div>
        </div>
      )}
    </div>
  )
}

function DecisionCard({ decision, onApprove, loading }: {
  decision: any; onApprove: () => void; loading: boolean
}) {
  return (
    <div className="card-inner p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-ink-primary truncate">{decision.product_name}</div>
          <div className="text-[10px] text-ink-tertiary font-mono">{decision.sku}</div>
        </div>
        <ActionBadge action={decision.action} />
      </div>
      <div className="flex items-center gap-3 text-[11px] font-mono mb-2">
        <span className="text-ink-tertiary">
          ₹{decision.current_price?.toLocaleString('en-IN')} →
        </span>
        <span className="text-acid font-semibold">
          ₹{decision.recommended_price?.toLocaleString('en-IN')}
        </span>
        <span className={clsx(
          decision.price_change_pct > 0 ? 'text-acid' : 'text-crimson-signal'
        )}>
          ({decision.price_change_pct > 0 ? '+' : ''}{decision.price_change_pct?.toFixed(1)}%)
        </span>
      </div>
      <div className="mb-2">
        <ConfidenceBar value={decision.confidence} />
      </div>
      <p className="text-[10px] text-ink-tertiary mb-3 line-clamp-2">{decision.reasoning}</p>
      <button
        className="btn-primary w-full justify-center text-xs py-1.5"
        onClick={onApprove}
        disabled={loading}
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Apply Price
      </button>
    </div>
  )
}

function SimSlider({
  label, value, min, max, step, display, onChange
}: {
  label: string; value: number; min: number; max: number
  step: number; display: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label">{label}</label>
        <span className="text-xs font-mono text-acid">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#00F5A0] bg-carbon-700 rounded h-1.5 cursor-pointer"
      />
    </div>
  )
}

function SimResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="label mb-1">AI Recommended Price</div>
        <div className="text-3xl font-mono font-bold text-acid">
          ₹{result.recommended_price?.toLocaleString('en-IN')}
        </div>
        <div className="text-xs font-mono text-ink-tertiary mt-1">
          from ₹{result.current_price?.toLocaleString('en-IN')} current
        </div>
      </div>

      <div className="border-t border-[#1E2D40] pt-4 space-y-2.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-ink-tertiary">Action</span>
          <ActionBadge action={result.action} />
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-ink-tertiary">Price Change</span>
          <span className={result.price_change_pct > 0 ? 'text-acid' : 'text-crimson-signal'}>
            {result.price_change_pct > 0 ? '+' : ''}{result.price_change_pct?.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-ink-tertiary">Expected Margin</span>
          <span className="text-ink-primary">{result.expected_margin_pct?.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-ink-tertiary">Revenue Impact</span>
          <span className={result.expected_revenue_impact > 0 ? 'text-acid' : 'text-crimson-signal'}>
            {result.expected_revenue_impact > 0 ? '+' : ''}{result.expected_revenue_impact?.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="border-t border-[#1E2D40] pt-3">
        <div className="label mb-2">Confidence</div>
        <ConfidenceBar value={result.confidence} />
      </div>

      <div className="bg-carbon-800 rounded-lg p-3">
        <div className="label mb-1.5">Reasoning</div>
        <p className="text-[11px] text-ink-secondary leading-relaxed">{result.reasoning}</p>
      </div>
    </div>
  )
}
