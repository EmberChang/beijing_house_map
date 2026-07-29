// ===== 地标类型 =====
export type LandmarkCategory = 'home' | 'work' | 'business' | 'school' | 'hospital' | 'park' | 'gym' | 'restaurant' | 'transport' | 'other'

export const LANDMARK_CATEGORIES: { value: LandmarkCategory; label: string; defaultVisits: number; weight: number }[] = [
  { value: 'home',        label: '🏠 家',       defaultVisits: 365, weight: 1   },
  { value: 'work',        label: '💼 公司',     defaultVisits: 250, weight: 1   },
  { value: 'business',    label: '🛍️ 商圈',     defaultVisits: 52,  weight: 0.8 },
  { value: 'school',      label: '🏫 学校',     defaultVisits: 200, weight: 0.8 },
  { value: 'hospital',    label: '🏥 医院',     defaultVisits: 12,  weight: 0.6 },
  { value: 'park',        label: '🌳 公园',     defaultVisits: 24,  weight: 0.5 },
  { value: 'gym',         label: '🏋️ 健身',     defaultVisits: 100, weight: 0.7 },
  { value: 'restaurant',  label: '🍽️ 餐饮',     defaultVisits: 36,  weight: 0.7 },
  { value: 'transport',   label: '🚉 交通枢纽',  defaultVisits: 100, weight: 0.6 },
  { value: 'other',       label: '📍 其他',     defaultVisits: 12,  weight: 0.5 },
]

export interface Landmark {
  id: string
  name: string
  address: string
  lng: number
  lat: number
  category: LandmarkCategory
  weight: number
  visitsPerYear: number
}

// ===== 楼盘类型 =====
export interface Property {
  id: string
  name: string
  address: string
  lng: number
  lat: number
  price?: number // 均价(元/㎡)
}

// ===== 路线类型 =====
export type TravelMode = 'driving' | 'transit' | 'walking'

export interface RouteInfo {
  mode: TravelMode
  duration: number // 秒
  distance: number // 米
  // 驾车特有
  trafficDuration?: number // 拥堵时耗时(秒)
  tollDistance?: number // 收费距离(米)
  // 公交特有
  transitSteps?: TransitStep[]
  transferCount?: number // 换乘次数
  walkingDistance?: number // 步行距离(米)
  // 步行特有
  walkSteps?: WalkStep[]
}

export interface TransitStep {
  type: 'walking' | 'bus' | 'subway'
  instruction: string
  duration: number // 秒
  distance: number // 米
  lineName?: string // 公交/地铁线路名
  departureStop?: string // 上车站
  arrivalStop?: string // 下车站
  intermediateStops?: number // 途经站数
}

export interface WalkStep {
  instruction: string
  duration: number
  distance: number
  roadName?: string
}

// ===== 楼盘路线结果 =====
export interface PropertyRouteResult {
  propertyId: string
  propertyName: string
  routes: {
    landmarkId: string
    landmarkName: string
    modes: {
      driving?: RouteInfo
      transit?: RouteInfo
      walking?: RouteInfo
    }
  }[]
  score: PropertyScore
}

// ===== 评分模型 =====
export interface PropertyScore {
  total: number // 0-100
  breakdown: {
    landmarkId: string
    landmarkName: string
    score: number // 0-100
    details: {
      transitScore: number
      drivingScore: number
      walkingScore: number
      transferPenalty: number // 换乘扣分
      comfortScore: number // 舒适度
    }
  }[]
}

export interface ScoreConfig {
  // 出行方式偏好权重
  transitWeight: number
  drivingWeight: number
  walkingWeight: number
  // 评分参数
  idealCommuteMinutes: number // 理想通勤时间(分钟)
  maxCommuteMinutes: number // 可接受最大通勤时间
  transferPenaltyPerTransfer: number // 每次换乘扣分
  walkingDistancePenalty: number // 步行距离扣分因子
}

// ===== 收藏楼盘类型 =====
export interface FavoriteProperty extends Property {
  addedAt: number // timestamp
  score?: number // 缓存的最新评分
}

// ===== 计算历史 =====
export interface CalcHistoryItem {
  id: string
  timestamp: number
  property: Property
  result: PropertyRouteResult
}
