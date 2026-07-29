import type {
  Landmark,
  Property,
  PropertyRouteResult,
  PropertyScore,
  ScoreConfig,
  RouteInfo,
  TravelMode,
} from '../types'

const DEFAULT_CONFIG: ScoreConfig = {
  transitWeight: 0.5,
  drivingWeight: 0.3,
  walkingWeight: 0.2,
  idealCommuteMinutes: 30,
  maxCommuteMinutes: 90,
  transferPenaltyPerTransfer: 8,
  walkingDistancePenalty: 0.5,
}

/**
 * 对单条路线评分 (0-100)
 * 基于理想通勤时间和最大可接受时间做归一化
 */
function scoreRoute(route: RouteInfo | null | undefined, config: ScoreConfig): number {
  if (!route) return 0

  const minutes = route.duration / 60

  if (minutes <= config.idealCommuteMinutes) {
    return 100
  }

  if (minutes >= config.maxCommuteMinutes) {
    return 10 // 最低分保底
  }

  // 线性衰减
  const range = config.maxCommuteMinutes - config.idealCommuteMinutes
  const exceed = minutes - config.idealCommuteMinutes
  return 100 - (exceed / range) * 90
}

/**
 * 计算公交路线的换乘惩罚
 */
function calcTransferPenalty(route: RouteInfo | null | undefined, config: ScoreConfig): number {
  if (!route || route.mode !== 'transit') return 0
  const transfers = route.transferCount || 0
  return transfers * config.transferPenaltyPerTransfer
}

/**
 * 计算步行距离惩罚
 */
function calcWalkingPenalty(route: RouteInfo | null | undefined, config: ScoreConfig): number {
  if (!route) return 0
  const walkMeters = route.walkingDistance || 0
  // 每500米步行约扣2.5分
  return (walkMeters / 500) * config.walkingDistancePenalty * 5
}

/**
 * 计算舒适度（基于换乘次数、步行距离）
 */
function calcComfortScore(
  transitRoute: RouteInfo | null | undefined,
  _config: ScoreConfig
): number {
  if (!transitRoute || transitRoute.mode !== 'transit') return 100

  let comfort = 100
  // 换乘扣分
  const transfers = transitRoute.transferCount || 0
  comfort -= transfers * 10
  // 步行距离扣分
  const walkKm = (transitRoute.walkingDistance || 0) / 1000
  comfort -= walkKm * 8

  return Math.max(0, Math.min(100, comfort))
}

/**
 * 计算单个楼盘对所有地标的综合评分
 */
export function calculateScore(
  property: Property,
  landmarks: Landmark[],
  routeMap: Map<string, Map<TravelMode, RouteInfo | null>>,
  config: ScoreConfig = DEFAULT_CONFIG
): PropertyRouteResult {
  const routes: PropertyRouteResult['routes'] = []
  const breakdown: PropertyScore['breakdown'] = []

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

    const transitScore = scoreRoute(transit, config)
    const drivingScore = scoreRoute(driving, config)
    const walkingScore = scoreRoute(walking, config)
    const transferPenalty = calcTransferPenalty(transit, config)
    const comfortScore = calcComfortScore(transit, config)

    // 加权得分
    const weightedScore =
      transitScore * config.transitWeight +
      drivingScore * config.drivingWeight +
      walkingScore * config.walkingWeight -
      transferPenalty

    breakdown.push({
      landmarkId: landmark.id,
      landmarkName: landmark.name,
      score: Math.max(0, Math.min(100, weightedScore)),
      details: {
        transitScore,
        drivingScore,
        walkingScore,
        transferPenalty,
        comfortScore,
      },
    })
  }

  // 按地标权重计算总分
  const totalWeight = landmarks.reduce((sum, l) => sum + l.weight, 0)
  const total =
    totalWeight > 0
      ? breakdown.reduce((sum, b) => {
          const landmark = landmarks.find((l) => l.id === b.landmarkId)
          const w = landmark?.weight || 1
          return sum + (b.score * w) / totalWeight
        }, 0)
      : breakdown.reduce((sum, b) => sum + b.score, 0) / Math.max(1, breakdown.length)

  return {
    propertyId: property.id,
    propertyName: property.name,
    routes,
    score: {
      total: Math.round(total * 10) / 10,
      breakdown,
    },
  }
}
