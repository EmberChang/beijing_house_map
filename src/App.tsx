import { useEffect } from 'react'
import MapContainer from './components/MapContainer'
import Sidebar from './components/Sidebar'
import { useLandmarkStore } from './stores/landmarkStore'
import { useFavoritesStore } from './stores/favoritesStore'

export default function App() {
  const loadLandmarks = useLandmarkStore((s) => s.loadFromStorage)
  const loadFavorites = useFavoritesStore((s) => s.loadFromStorage)

  useEffect(() => {
    loadLandmarks()
    loadFavorites()
  }, [loadLandmarks, loadFavorites])

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MapContainer />
      <Sidebar />
    </div>
  )
}
