import type {
  Landmark,
  Property,
  PropertyRouteResult,
  PropertyScore,
  ScoreConfig,
  RouteInfo,
  TravelMode,
} from '../types'
import { LANDMARK_CATEGORIES } from '../types'

const DEFAULT_CONFIG: ScoreConfig = {
  transitWeight: 0.6,
  drivingWeight: 0.4,
  walkingWeight: 0,
  idealCommuteMinutes: 30,
  maxCommuteMinutes: 90,
  transferPenaltyPerTransfer: 8,
  walkingDistancePenalty: 0.5,
}

function getCategoryWeight(category: string): number {
  return LANDMARK_CATEGORIES.find(c => c.value === category)?.weight ?? 0.5
}

/**
 * 评分模型：年加权往返总时间 → 百分制
 * - 混合单程时间 = 公交 × 公交权重 + 驾车 × 驾车权重
 * - 年总耗时 = 每年次数 × 往返时间 × 类型权重
 * - 总分 0-100，耗时越少分越高
 */
export function calculateScore(
  property: Property,
  landmarks: Landmark[],
  routeMap: Map<string, Map<TravelMode, RouteInfo | null>>,
  config: ScoreConfig = DEFAULT_CONFIG
): PropertyRouteResult {
  const routes: PropertyRouteResult['routes'] = []
  const breakdown: PropertyScore['breakdown'] = []
  let totalWeightedYearlyHours = 0

  for (const landmark of landmarks) {
    const modes = routeMap.get(landmark.id)
    const driving = modes?.get('driving') ?? undefined
    const transit = modes?.get('transit') ?? undefined
    const walking = modes?.get('walking') ?? undefined

    routes.push({
      landmarkId: landmark.id,
      landmarkName: landmark.name,
      modes: { driving, transit, walking },
    })

    // 混合单程时间（分钟）
    const tMin = transit ? transit.duration / 60 : Infinity
    const dMin = driving ? driving.duration / 60 : Infinity
    const mixedMin = config.transitWeight * tMin + config.drivingWeight * dMin

    // 年加权耗时 = 年次数 × 往返分钟 / 60 × 类型权重
    const visits = landmark.visitsPerYear || 1
    const catWeight = getCategoryWeight(landmark.category)
    const roundTripMin = mixedMin * 2
    const yearlyHours = visits * roundTripMin / 60
    const weightedHours = yearlyHours * catWeight
    totalWeightedYearlyHours += weightedHours

    // 每个地标的子评分
    const subScore = Math.max(0, Math.min(100, 100 - (weightedHours / 500) * 100))
    breakdown.push({
      landmarkId: landmark.id,
      landmarkName: landmark.name,
      score: Math.round(subScore * 10) / 10,
      details: {
        transitScore: Math.round((transit?.duration || 0) / 60),
        drivingScore: Math.round((driving?.duration || 0) / 60),
        walkingScore: Math.round((walking?.duration || 0) / 60),
        transferPenalty: transit?.transferCount || 0,
        comfortScore: Math.round(yearlyHours),
      },
    })
  }

  // 总分归一化
  const maxHours = landmarks.length * 200
  const totalScore = Math.max(0, Math.min(100,
    100 - (totalWeightedYearlyHours / maxHours) * 100
  ))

  return {
    propertyId: property.id,
    propertyName: property.name,
    routes,
    score: {
      total: Math.round(totalScore * 10) / 10,
      breakdown,
    },
  }
}
