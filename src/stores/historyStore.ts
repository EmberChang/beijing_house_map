import { create } from 'zustand'
import type { CalcHistoryItem, Property, PropertyRouteResult } from '../types'

interface HistoryStore {
  history: CalcHistoryItem[]
  addEntry: (property: Property, result: PropertyRouteResult) => void
  clearHistory: () => void
  exportData: () => string
  loadFromStorage: () => void
  saveToStorage: () => void
}

export const STORAGE_KEYS = {
  landmarks: 'house_map_landmarks',
  favorites: 'house_map_favorites',
  history: 'house_map_history',
}

const STORAGE_KEY = STORAGE_KEYS.history

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],

  addEntry: (property, result) => {
    set((state) => {
      // 去重：如果同 property ID 已有记录，替换它
      const filtered = state.history.filter((e) => e.property.id !== property.id)
      const entry: CalcHistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: Date.now(),
        property,
        result,
      }
      return { history: [entry, ...filtered].slice(0, 100) }
    })
    get().saveToStorage()
  },

  clearHistory: () => {
    set({ history: [] })
    get().saveToStorage()
  },

  // 导出所有本地数据为 JSON 字符串
  exportData: () => {
    const data: Record<string, any> = {}
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      try {
        const raw = localStorage.getItem(key)
        data[name] = raw ? JSON.parse(raw) : []
      } catch {
        data[name] = []
      }
    }
    return JSON.stringify(data, null, 2)
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
