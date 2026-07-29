import { useRouteStore } from '../stores/routeStore'

export default function ScoreCard() {
  const { propertyRoutes } = useRouteStore()

  if (!propertyRoutes) return null

  const { score } = propertyRoutes

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600'
    if (s >= 60) return 'text-yellow-600'
    return 'text-red-500'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">📈 评分详情</h3>

      <div className="space-y-2">
        {score.breakdown.map((b) => (
          <div key={b.landmarkId} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{b.landmarkName}</span>
              <span className={`text-lg font-bold ${getScoreColor(b.score)}`}>
                {b.score}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
              <span>公交: {b.details.transitScore.toFixed(0)}</span>
              <span>驾车: {b.details.drivingScore.toFixed(0)}</span>
              <span>步行: {b.details.walkingScore.toFixed(0)}</span>
              <span>换乘扣分: -{b.details.transferPenalty.toFixed(0)}</span>
              <span className="col-span-2">
                舒适度: {b.details.comfortScore.toFixed(0)}/100
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
