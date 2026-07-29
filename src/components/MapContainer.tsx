import { useEffect, useRef, useState } from 'react'
import { loadAMapScript } from '../services/amap'
import { useLandmarkStore } from '../stores/landmarkStore'
import { useRouteStore } from '../stores/routeStore'

export default function MapContainer() {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const { landmarks } = useLandmarkStore()
  const { searchResults, setSelectedProperty } = useRouteStore()

  // 初始化地图
  useEffect(() => {
    let cancelled = false

    async function initMap() {
      try {
        await loadAMapScript()
        if (cancelled) return

        const AMap = (window as any).AMap
        if (!AMap?.Map) {
          await new Promise<void>((r) => setTimeout(r, 1500))
          if (cancelled) return
        }

        const amap = (window as any).AMap
        if (!amap?.Map) return

        if (mapInstanceRef.current) {
          setMapReady(true)
          return
        }

        const map = new amap.Map(mapRef.current, {
          zoom: 12,
          center: [116.397428, 39.90923],
          viewMode: '3D',
        })

        mapInstanceRef.current = map
        if (!cancelled) setMapReady(true)
      } catch (err) {
        console.error('Map init error:', err)
      }
    }

    initMap()

    return () => {
      cancelled = true
    }
  }, [])

  // 地标标记更新
  useEffect(() => {
    const AMap = (window as any).AMap
    if (!AMap || !mapInstanceRef.current) return

    // 清除旧标记
    markersRef.current.forEach((m: any) => {
      m.setMap(null)
    })
    markersRef.current = []

    const map = mapInstanceRef.current

    landmarks.forEach((landmark) => {
      const marker = new AMap.Marker({
        position: [landmark.lng, landmark.lat],
        title: landmark.name,
        label: {
          content: `<div style="background:#e74c3c;color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;white-space:nowrap">${landmark.name}</div>`,
          direction: 'top',
        },
      })
      marker.setMap(map)
      markersRef.current.push(marker)
    })
  }, [landmarks])

  // 搜索结果标记更新
  useEffect(() => {
    const AMap = (window as any).AMap
    if (!AMap || !mapInstanceRef.current) return

    const map = mapInstanceRef.current

    searchResults.forEach((property) => {
      const marker = new AMap.Marker({
        position: [property.lng, property.lat],
        title: property.name,
        label: {
          content: `<div style="background:#3498db;color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;white-space:nowrap">${property.name}</div>`,
          direction: 'bottom',
        },
      })

      marker.on('click', () => {
        setSelectedProperty(property)
        map.setCenter([property.lng, property.lat])
      })

      marker.setMap(map)
      markersRef.current.push(marker)
    })
  }, [searchResults, setSelectedProperty])

  return (
    <>
      <div
        ref={mapRef}
        className="map-container absolute inset-0"
        style={{ zIndex: 0 }}
      />
      {!mapReady && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            zIndex: 1,
            background: 'linear-gradient(135deg, #e8f4f8 0%, #d4e8f0 30%, #c8e6c9 60%, #e8f5e9 100%)',
          }}
        >
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-gray-500 text-sm">地图加载中...</p>
          <p className="text-gray-400 text-xs mt-1">搜索楼盘后将在此显示标记</p>
        </div>
      )}
    </>
  )
}
