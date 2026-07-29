import { useEffect } from 'react'
import MapContainer from './components/MapContainer'
import Sidebar from './components/Sidebar'
import { useLandmarkStore } from './stores/landmarkStore'
import { useFavoritesStore } from './stores/favoritesStore'
import { useHistoryStore } from './stores/historyStore'

export default function App() {
  const loadLandmarks = useLandmarkStore((s) => s.loadFromStorage)
  const loadFavorites = useFavoritesStore((s) => s.loadFromStorage)
  const loadHistory = useHistoryStore((s) => s.loadFromStorage)

  useEffect(() => {
    loadLandmarks()
    loadFavorites()
    loadHistory()
  }, [])

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MapContainer />
      <Sidebar />
    </div>
  )
}
