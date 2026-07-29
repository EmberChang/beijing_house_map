import { useEffect, useRef } from 'react'
import { loadAMapScript, isAMapLoaded } from '../services/amap'
import { useLandmarkStore } from '../stores/landmarkStore'
import { useRouteStore } from '../stores/routeStore'

export default function MapContainer() {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const { landmarks } = useLandmarkStore()
  const { searchResults, setSelectedProperty } = useRouteStore()

  // 初始化地图
  useEffect(() => {
    loadAMapScript().then(() => {
      const AMap = (window as any).AMap
      if (!AMap || mapInstanceRef.current) return

      const map = new AMap.Map(mapRef.current, {
        zoom: 12,
        center: [116.397428, 39.90923], // 北京天安门
        viewMode: '3D',
      })

      // 添加地图控件
      map.addControl(new AMap.Scale())
      map.addControl(new AMap.ToolBar({ position: 'RT' }))

      mapInstanceRef.current = map
    })
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
    <div
      ref={mapRef}
      className="map-container absolute inset-0"
      style={{ zIndex: 0 }}
    />
  )
}
