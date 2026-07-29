import { create } from 'zustand'
import type { CalcHistoryItem, Property, PropertyRouteResult } from '../types'

interface HistoryStore {
  history: CalcHistoryItem[]
  addEntry: (property: Property, result: PropertyRouteResult) => void
  clearHistory: () => void
  loadFromStorage: () => void
  saveToStorage: () => void
}

const STORAGE_KEY = 'house_map_history'

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],

  addEntry: (property, result) => {
    const entry: CalcHistoryItem = {
      id: 'hist_' + Date.now(),
      timestamp: Date.now(),
      property,
      result,
    }
    // 最新的在前面
    set((state) => ({
      history: [entry, ...state.history].slice(0, 100),
    }))
    get().saveToStorage()
  },

  clearHistory: () => {
    set({ history: [] })
    get().saveToStorage()
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) set({ history: JSON.parse(stored) })
    } catch { /* ignore */ }
  },

  saveToStorage: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().history))
    } catch { /* ignore */ }
  },
}))
