import { useRouteStore } from '../stores/routeStore'
import { useLandmarkStore } from '../stores/landmarkStore'
import { planRoute } from '../services/amap'
import { calculateScore } from '../services/scoreEngine'
import type { TravelMode } from '../types'

const MODE_LABELS: Record<TravelMode, string> = {
  driving: '🚗 驾车',
  transit: '🚌 公交',
  walking: '🚶 步行',
}

export default function RoutePanel() {
  const { landmarks } = useLandmarkStore()
  const {
    selectedProperty,
    propertyRoutes,
    isLoadingRoutes,
    setPropertyRoutes,
    setIsLoadingRoutes,
    scoreConfig,
  } = useRouteStore()

  const handleCalculate = async () => {
    if (!selectedProperty || landmarks.length === 0) return
    setIsLoadingRoutes(true)

    try {
      const routeMap = new Map()
      const modes: TravelMode[] = ['driving', 'transit', 'walking']

      for (const landmark of landmarks) {
        const modeMap = new Map<TravelMode, any>()

        for (const mode of modes) {
          const route = await planRoute(
            { lng: selectedProperty.lng, lat: selectedProperty.lat },
            { lng: landmark.lng, lat: landmark.lat },
            mode
          )
          modeMap.set(mode, route)
          // QPS 控制
          await new Promise((r) => setTimeout(r, 350))
        }

        routeMap.set(landmark.id, modeMap)
      }

      const result = calculateScore(selectedProperty, landmarks, routeMap, scoreConfig)
      setPropertyRoutes(result)
    } catch (err) {
      console.error('路线计算失败:', err)
    } finally {
      setIsLoadingRoutes(false)
    }
  }

  if (!selectedProperty) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <p className="text-gray-400 text-sm text-center py-4">
          请在地图上点击楼盘或搜索楼盘
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-h-[60vh] flex flex-col">
      <h3 className="text-lg font-bold text-gray-800 mb-3 truncate">
        🏢 {selectedProperty.name}
      </h3>
      <p className="text-xs text-gray-400 mb-3 truncate">{selectedProperty.address}</p>

      {propertyRoutes && (
        <div className="mb-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">综合评分</span>
            <span className="text-2xl font-bold text-blue-600">
              {propertyRoutes.score.total}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleCalculate}
        disabled={isLoadingRoutes || landmarks.length === 0}
        className="w-full py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 mb-3"
      >
        {isLoadingRoutes ? '⏳ 计算中...' : '📊 计算通勤路线'}
      </button>

      {landmarks.length === 0 && (
        <p className="text-xs text-orange-500 text-center">请先添加地标</p>
      )}

      {propertyRoutes && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {propertyRoutes.routes.map((route) => (
            <div key={route.landmarkId} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{route.landmarkName}</span>
                <span className="text-xs text-gray-400">
                  得分: {propertyRoutes.score.breakdown.find((b) => b.landmarkId === route.landmarkId)?.score ?? '-'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['driving', 'transit', 'walking'] as TravelMode[]).map((mode) => {
                  const info = route.modes[mode]
                  return (
                    <div
                      key={mode}
                      className="bg-gray-50 rounded p-2 text-center"
                    >
                      <div className="text-xs text-gray-400 mb-1">{MODE_LABELS[mode]}</div>
                      {info ? (
                        <>
                          <div className="text-sm font-bold text-gray-700">
                            {Math.round(info.duration / 60)}分钟
                          </div>
                          {mode === 'transit' && info.transferCount !== undefined && (
                            <div className="text-xs text-gray-400">
                              换乘{info.transferCount}次
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-300">无数据</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
