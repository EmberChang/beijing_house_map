import { useEffect } from 'react'
import MapContainer from './components/MapContainer'
import SearchPanel from './components/SearchPanel'
import LandmarkManager from './components/LandmarkManager'
import RoutePanel from './components/RoutePanel'
import ScoreCard from './components/ScoreCard'
import { useLandmarkStore } from './stores/landmarkStore'

export default function App() {
  const loadFromStorage = useLandmarkStore((s) => s.loadFromStorage)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* 地图背景 */}
      <MapContainer />

      {/* 顶部搜索栏 */}
      <div className="absolute top-4 left-4 right-4 z-10 max-w-lg">
        <SearchPanel />
      </div>

      {/* 左侧面板 */}
      <div className="absolute top-28 left-4 z-10 w-72 space-y-3">
        <LandmarkManager />
        <ScoreCard />
      </div>

      {/* 右侧面板 */}
      <div className="absolute top-28 right-4 z-10 w-80">
        <RoutePanel />
      </div>
    </div>
  )
}
