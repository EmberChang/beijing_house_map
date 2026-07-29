import { create } from 'zustand'
import type { Property, PropertyRouteResult, ScoreConfig } from '../types'

interface RouteStore {
  selectedProperty: Property | null
  propertyRoutes: PropertyRouteResult | null
  isLoadingRoutes: boolean
  scoreConfig: ScoreConfig
  searchResults: Property[]

  setSelectedProperty: (property: Property | null) => void
  setPropertyRoutes: (routes: PropertyRouteResult | null) => void
  setIsLoadingRoutes: (loading: boolean) => void
  setScoreConfig: (config: Partial<ScoreConfig>) => void
  setSearchResults: (results: Property[]) => void
}

export const useRouteStore = create<RouteStore>((set) => ({
  selectedProperty: null,
  propertyRoutes: null,
  isLoadingRoutes: false,
  scoreConfig: {
    transitWeight: 0.5,
    drivingWeight: 0.3,
    walkingWeight: 0.2,
    idealCommuteMinutes: 30,
    maxCommuteMinutes: 90,
    transferPenaltyPerTransfer: 8,
    walkingDistancePenalty: 0.5,
  },
  searchResults: [],

  setSelectedProperty: (property) => set({ selectedProperty: property }),
  setPropertyRoutes: (routes) => set({ propertyRoutes: routes }),
  setIsLoadingRoutes: (loading) => set({ isLoadingRoutes: loading }),
  setScoreConfig: (config) =>
    set((state) => ({ scoreConfig: { ...state.scoreConfig, ...config } })),
  setSearchResults: (results) => set({ searchResults: results }),
}))
