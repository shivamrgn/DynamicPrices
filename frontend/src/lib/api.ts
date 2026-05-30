import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
}) as any

// Response interceptor for error handling
api.interceptors.response.use(
  (response: any) => response.data,
  (error: any) => {
    const message = error.response?.data?.detail || error.message || 'Request failed'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getOverview: () => api.get('/dashboard/overview'),
  getLiveFeed: () => api.get('/dashboard/live-feed'),
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: { category?: string; page?: number; limit?: number }) =>
    api.get('/products/', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products/', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  getCategories: () => api.get('/products/categories/list'),
}

// ─── Competitors ──────────────────────────────────────────────────────────────
export const competitorsApi = {
  getMatrix: (productId?: string) => api.get('/competitors/matrix', { params: { product_id: productId } }),
  getSummary: () => api.get('/competitors/summary'),
  getHistory: (productId: string, days?: number) =>
    api.get(`/competitors/history/${productId}`, { params: { days } }),
  scrape: () => api.post('/competitors/scrape'),
  add: (data: { product_id: string; competitor_name: string; competitor_price: number; in_stock: boolean }) =>
    api.post('/competitors/add', data),
}

// ─── Forecasting ──────────────────────────────────────────────────────────────
export const forecastingApi = {
  getProductForecast: (productId: string, horizonDays?: number) =>
    api.get(`/forecasting/product/${productId}`, { params: { horizon_days: horizonDays } }),
  getAll: (limit?: number) => api.get('/forecasting/all', { params: { limit } }),
}

// ─── Elasticity ───────────────────────────────────────────────────────────────
export const elasticityApi = {
  getProduct: (productId: string) => api.get(`/elasticity/product/${productId}`),
  getAll: () => api.get('/elasticity/all'),
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryApi = {
  getAlerts: () => api.get('/inventory/alerts'),
  getSummary: () => api.get('/inventory/summary'),
}

// ─── RL Engine ────────────────────────────────────────────────────────────────
export const rlApi = {
  getDecisions: (limit?: number) => api.get('/rl/decisions', { params: { limit } }),
  approveDecision: (decisionId: string, overridePrice?: number) =>
    api.post(`/rl/approve/${decisionId}`, { override_price: overridePrice }),
  simulate: (data: any) => api.post('/rl/simulate', data),
  generateDecision: (productId: string) => api.post(`/rl/generate/${productId}`),
}

// ─── Prices ───────────────────────────────────────────────────────────────────
export const pricesApi = {
  getHistory: (productId: string, days?: number) =>
    api.get(`/prices/history/${productId}`, { params: { days } }),
  update: (data: any) => api.post('/prices/update', data),
}
