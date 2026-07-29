import { create } from 'zustand'
import type { Landmark } from '../types'
import { persist, load } from '../services/storage'

const NAME = 'landmarks'

interface LandmarkStore {
  landmarks: Landmark[]
  addLandmark: (landmark: Landmark) => void
  updateLandmark: (id: string, updates: Partial<Landmark>) => void
  removeLandmark: (id: string) => void
  loadFromStorage: () => Promise<void>
  saveToStorage: () => void
}

export const useLandmarkStore = create<LandmarkStore>((set, get) => ({
  landmarks: [],

  addLandmark: (landmark) => {
    set((state) => ({ landmarks: [...state.landmarks, landmark] }))
    get().saveToStorage()
  },

  updateLandmark: (id, updates) => {
    set((state) => ({
      landmarks: state.landmarks.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }))
    get().saveToStorage()
  },

  removeLandmark: (id) => {
    set((state) => ({ landmarks: state.landmarks.filter((l) => l.id !== id) }))
    get().saveToStorage()
  },

  loadFromStorage: async () => {
    const data = await load(NAME)
    if (data) set({ landmarks: data })
  },

  saveToStorage: () => {
    persist(NAME, get().landmarks)
  },
}))
