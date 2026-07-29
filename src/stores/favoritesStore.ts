import { create } from 'zustand'
import type { FavoriteProperty, Property } from '../types'

interface FavoritesStore {
  favorites: FavoriteProperty[]
  addFavorite: (property: Property) => void
  removeFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  updateScore: (id: string, score: number) => void
  loadFromStorage: () => void
  saveToStorage: () => void
}

const STORAGE_KEY = 'house_map_favorites'

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: [],

  addFavorite: (property) => {
    if (get().isFavorite(property.id)) return
    set((state) => ({
      favorites: [...state.favorites, { ...property, addedAt: Date.now() }],
    }))
    get().saveToStorage()
  },

  removeFavorite: (id) => {
    set((state) => ({
      favorites: state.favorites.filter((f) => f.id !== id),
    }))
    get().saveToStorage()
  },

  isFavorite: (id) => get().favorites.some((f) => f.id === id),

  updateScore: (id, score) => {
    set((state) => ({
      favorites: state.favorites.map((f) =>
        f.id === id ? { ...f, score } : f
      ),
    }))
    get().saveToStorage()
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) set({ favorites: JSON.parse(stored) })
    } catch { /* ignore */ }
  },

  saveToStorage: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().favorites))
    } catch { /* ignore */ }
  },
}))
