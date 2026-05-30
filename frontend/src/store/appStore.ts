import { create } from 'zustand'

interface AppStore {
  selectedProductId: string | null
  setSelectedProduct: (id: string | null) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  lastRefreshed: Date | null
  setLastRefreshed: (date: Date) => void
}

export const useAppStore = create<AppStore>((set) => ({
  selectedProductId: null,
  setSelectedProduct: (id) => set({ selectedProductId: id }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  lastRefreshed: null,
  setLastRefreshed: (date) => set({ lastRefreshed: date }),
}))
