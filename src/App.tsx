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

      {/* 顶部搜索栏 — 最高层级 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[480px] max-w-[calc(100%-16px)]">
        <SearchPanel />
      </div>

      {/* 左侧面板 — 地标管理 */}
      <div className="absolute top-4 left-4 z-10 w-72 max-h-[calc(100vh-32px)] overflow-y-auto space-y-3" style={{ maxHeight: 'calc(100vh - 32px)' }}>
        <LandmarkManager />
        <ScoreCard />
      </div>

      {/* 右侧面板 — 路线详情 */}
      <div className="absolute top-4 right-4 z-10 w-80 max-h-[calc(100vh-32px)] overflow-y-auto">
        <RoutePanel />
      </div>
    </div>
  )
}
