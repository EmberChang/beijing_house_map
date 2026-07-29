import type {
  Landmark,
  Property,
  RouteInfo,
  TravelMode,
  TransitStep,
  WalkStep,
} from '../types'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY
const AMAP_BASE = 'https://restapi.amap.com/v3'
const AMAP_BASE_V4 = 'https://restapi.amap.com/v4'

// ===== 地理编码 =====
export async function geocode(address: string): Promise<{ lng: number; lat: number } | null> {
  const res = await fetch(
    `${AMAP_BASE}/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=北京`
  )
  const data = await res.json()
  if (data.status === '1' && data.geocodes?.length > 0) {
    const [lng, lat] = data.geocodes[0].location.split(',').map(Number)
    return { lng, lat }
  }
  return null
}

export async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  const res = await fetch(
    `${AMAP_BASE}/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}`
  )
  const data = await res.json()
  if (data.status === '1' && data.regeocode) {
    return data.regeocode.formatted_address
  }
  return null
}

// ===== POI 搜索 =====
export async function searchPOI(keywords: string, city = '北京'): Promise<Property[]> {
  const res = await fetch(
    `${AMAP_BASE}/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city)}&citylimit=true&offset=25`
  )
  const data = await res.json()
  if (data.status === '1' && data.pois) {
    return data.pois.map((p: any) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      lng: Number(p.location.split(',')[0]),
      lat: Number(p.location.split(',')[1]),
      price: undefined,
    }))
  }
  return []
}

// ===== 路径规划 =====
export async function planRoute(
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number },
  mode: TravelMode
): Promise<RouteInfo | null> {
  const originStr = `${origin.lng},${origin.lat}`
  const destStr = `${destination.lng},${destination.lat}`

  switch (mode) {
    case 'driving':
      return planDriving(originStr, destStr)
    case 'transit':
      return planTransit(originStr, destStr)
    case 'walking':
      return planWalking(originStr, destStr)
    default:
      return null
  }
}

async function planDriving(origin: string, destination: string): Promise<RouteInfo | null> {
  const res = await fetch(
    `${AMAP_BASE}/direction/driving?key=${AMAP_KEY}&origin=${origin}&destination=${destination}&strategy=0&extensions=base`
  )
  const data = await res.json()
  if (data.status === '1' && data.route?.paths?.length > 0) {
    const path = data.route.paths[0]
    return {
      mode: 'driving',
      duration: Number(path.duration),
      distance: Number(path.distance),
      trafficDuration: undefined,
      tollDistance: path.toll_distance ? Number(path.toll_distance) : undefined,
    }
  }
  return null
}

async function planTransit(origin: string, destination: string): Promise<RouteInfo | null> {
  const res = await fetch(
    `${AMAP_BASE}/direction/transit/integrated?key=${AMAP_KEY}&origin=${origin}&destination=${destination}&city=北京&cityd=北京&strategy=0`
  )
  const data = await res.json()
  if (data.status === '1' && data.route?.transits?.length > 0) {
    const route = data.route.transits[0]
    const steps: TransitStep[] = []
    let walkingDistance = 0

    if (route.segments) {
      for (const seg of route.segments) {
        if (seg.walking) {
          walkingDistance += Number(seg.walking.distance || 0)
          steps.push({
            type: 'walking',
            instruction: seg.walking.instruction || '步行',
            duration: Number(seg.walking.duration || 0),
            distance: Number(seg.walking.distance || 0),
          })
        }
        if (seg.bus && seg.bus.buslines) {
          for (const bl of seg.bus.buslines) {
            steps.push({
              type: bl.type?.includes('地铁') || bl.type?.includes('subway') ? 'subway' : 'bus',
              instruction: `${bl.type || '公交'} ${bl.name}`,
              duration: Number(bl.duration || 0),
              distance: Number(bl.distance || 0),
              lineName: bl.name,
              departureStop: bl.departure_stop?.name,
              arrivalStop: bl.arrival_stop?.name,
              intermediateStops: bl.via_num ? Number(bl.via_num) : undefined,
            })
          }
        }
      }
    }

    const transferCount = Math.max(0, (route.segments?.length || 0) - 1)

    return {
      mode: 'transit',
      duration: Number(route.duration || route.cost?.duration || 0),
      distance: Number(route.distance || 0),
      transitSteps: steps,
      transferCount,
      walkingDistance,
    }
  }
  return null
}

async function planWalking(origin: string, destination: string): Promise<RouteInfo | null> {
  const res = await fetch(
    `${AMAP_BASE}/direction/walking?key=${AMAP_KEY}&origin=${origin}&destination=${destination}`
  )
  const data = await res.json()
  if (data.status === '1' && data.route?.paths?.length > 0) {
    const path = data.route.paths[0]
    const walkSteps: WalkStep[] = (path.steps || []).map((s: any) => ({
      instruction: s.instruction || '',
      duration: Number(s.duration || 0),
      distance: Number(s.distance || 0),
      roadName: s.road || undefined,
    }))

    return {
      mode: 'walking',
      duration: Number(path.duration),
      distance: Number(path.distance),
      walkSteps,
    }
  }
  return null
}

// ===== 批量路径规划（带延迟控制，避免QPS超限） =====
export async function calculateAllRoutes(
  property: Property,
  landmarks: Landmark[],
  modes: TravelMode[]
): Promise<Map<string, Map<TravelMode, RouteInfo | null>>> {
  const results = new Map<string, Map<TravelMode, RouteInfo | null>>()

  for (const landmark of landmarks) {
    const landmarkResults = new Map<TravelMode, RouteInfo | null>()

    for (const mode of modes) {
      const route = await planRoute(
        { lng: property.lng, lat: property.lat },
        { lng: landmark.lng, lat: landmark.lat },
        mode
      )
      landmarkResults.set(mode, route)
      // QPS 控制：每次调用间隔 350ms
      await sleep(350)
    }

    results.set(landmark.id, landmarkResults)
  }

  return results
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ===== 加载高德 JS API 2.0 =====
let amapLoaded = false
let amapLoadPromise: Promise<void> | null = null

export function loadAMapScript(): Promise<void> {
  if (amapLoaded) return Promise.resolve()
  if (amapLoadPromise) return amapLoadPromise

  amapLoadPromise = new Promise((resolve, reject) => {
    const key = AMAP_KEY
    const version = import.meta.env.VITE_AMAP_VERSION || '2.0'
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/v=${version}/maps?v=2.0&key=${key}&plugin=AMap.Driving,AMap.Transfer,AMap.Walking,AMap.PlaceSearch,AMap.Geocoder`
    script.onload = () => {
      amapLoaded = true
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })

  return amapLoadPromise
}

export function isAMapLoaded(): boolean {
  return amapLoaded && !!(window as any).AMap
}
