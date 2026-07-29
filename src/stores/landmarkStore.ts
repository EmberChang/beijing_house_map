import { create } from 'zustand'
import type { Landmark } from '../types'

interface LandmarkStore {
  landmarks: Landmark[]
  addLandmark: (landmark: Landmark) => void
  updateLandmark: (id: string, updates: Partial<Landmark>) => void
  removeLandmark: (id: string) => void
  loadFromStorage: () => void
  saveToStorage: () => void
}

const STORAGE_KEY = 'house_map_landmarks'

export const useLandmarkStore = create<LandmarkStore>((set, get) => ({
  landmarks: [],

  addLandmark: (landmark) => {
    set((state) => {
      const updated = [...state.landmarks, landmark]
      return { landmarks: updated }
    })
    get().saveToStorage()
  },

  updateLandmark: (id, updates) => {
    set((state) => {
      const updated = state.landmarks.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      )
      return { landmarks: updated }
    })
    get().saveToStorage()
  },

  removeLandmark: (id) => {
    set((state) => ({
      landmarks: state.landmarks.filter((l) => l.id !== id),
    }))
    get().saveToStorage()
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        set({ landmarks: JSON.parse(stored) })
      }
    } catch {
      // ignore
    }
  },

  saveToStorage: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().landmarks))
    } catch {
      // ignore
    }
  },
}))
