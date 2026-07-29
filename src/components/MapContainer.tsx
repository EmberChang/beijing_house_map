import { useEffect, useRef, useState } from 'react'
import { loadAMap, reverseGeocode } from '../services/amap'
import { useLandmarkStore } from '../stores/landmarkStore'
import { useRouteStore } from '../stores/routeStore'
import { useFavoritesStore } from '../stores/favoritesStore'
import type { Property } from '../types'

// 全局回调注册，让 MapContainer 暴露 calculate 方法给外部
let globalCalculateFn: ((prop: Property) => void) | null = null
export function setMapCalculateHandler(fn: (prop: Property) => void) {
  globalCalculateFn = fn
}

export default function MapContainer() {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const { landmarks } = useLandmarkStore()
  const { searchResults, selectedProperty, setSelectedProperty, focusLocation, setFocusLocation } = useRouteStore()
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore()

  useEffect(() => {
    let cancelled = false
    async function initMap() {
      try {
        const AMap = await loadAMap()
        if (cancelled) return
        if (mapInstanceRef.current) { setMapReady(true); return }
        const map = new AMap.Map(mapRef.current, {
          zoom: 12, center: [116.397428, 39.90923], viewMode: '3D',
        })
        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar({ position: 'RT' }))
        map.on('click', () => { if (infoWindowRef.current) infoWindowRef.current.close() })
        // 地图点击选点：右键或长按获取位置
        map.on('rightclick', async (e: any) => {
          const addr = await reverseGeocode(e.lnglat.lng, e.lnglat.lat)
          if (!addr) return
          const prop: Property = {
            id: 'click_' + Date.now(),
            name: addr.split(/区|县|市/).pop()?.trim() || addr,
            address: addr,
            lng: e.lnglat.lng,
            lat: e.lnglat.lat,
          }
          setSelectedProperty(prop)
          showInfoWindow(prop)
        })
        mapInstanceRef.current = map
        if (!cancelled) setMapReady(true)
      } catch (err) { console.error('Map init error:', err) }
    }
    initMap()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedProperty) return
    const map = mapInstanceRef.current
    const timer = setTimeout(() => {
      map.setZoomAndCenter(15, [selectedProperty.lng, selectedProperty.lat])
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedProperty])

  // 外部触发地图定位（点击卡片等）
  useEffect(() => {
    if (!mapInstanceRef.current || !focusLocation) return
    mapInstanceRef.current.setZoomAndCenter(15, [focusLocation.lng, focusLocation.lat])
    setFocusLocation(null)
  }, [focusLocation, setFocusLocation])

  function showInfoWindow(property: Property) {
    const AMap = (window as any).AMap
    const map = mapInstanceRef.current
    if (!AMap || !map) return

    // 关闭已有信息窗
    if (infoWindowRef.current) infoWindowRef.current.close()

    const favorited = isFavorite(property.id)
    const uid = 'hm_' + Date.now()
    const content = `
      <div style="min-width:180px;padding:4px 0;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif">
        <div style="font-weight:bold;font-size:14px;margin-bottom:4px;color:#1a1a1a">${property.name}</div>
        <div style="font-size:12px;color:#999;margin-bottom:8px;line-height:1.4">${property.address}</div>
        <div style="display:flex;gap:6px">
          <button id="${uid}-calc" style="flex:1;padding:6px 0;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">📊 计算路线</button>
          <button id="${uid}-fav" style="flex:1;padding:6px 0;background:${favorited ? '#f59e0b' : '#10b981'};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">${favorited ? '⭐ 已收藏' : '➕ 收藏'}</button>
        </div>
      </div>`

    const infoWindow = new AMap.InfoWindow({
      content,
      offset: new AMap.Pixel(0, -35),
      closeWhenClickMap: true,
    })
    infoWindow.open(map, [property.lng, property.lat])
    infoWindowRef.current = infoWindow

    // 绑定按钮事件
    const bindButtons = () => {
      const calcBtn = document.getElementById(`${uid}-calc`)
      const favBtn = document.getElementById(`${uid}-fav`)
      if (calcBtn) {
        calcBtn.onclick = (e) => {
          e.stopPropagation()
          infoWindow.close()
          if (globalCalculateFn) globalCalculateFn(property)
        }
      }
      if (favBtn) {
        favBtn.onclick = (e) => {
          e.stopPropagation()
          if (isFavorite(property.id)) {
            removeFavorite(property.id)
          } else {
            addFavorite(property)
          }
          // 关闭后重新打开以刷新按钮状态
          infoWindow.close()
          setTimeout(() => showInfoWindow(property), 150)
        }
      }
    }

    setTimeout(bindButtons, 100)
  }

  useEffect(() => {
    const AMap = (window as any).AMap
    if (!AMap || !mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // 清除旧搜索结果标记
    markersRef.current.forEach((m: any) => {
      if (m._isSearchResult) m.setMap(null)
    })
    markersRef.current = markersRef.current.filter((m: any) => !m._isSearchResult)

    searchResults.forEach((property) => {
      const marker = new AMap.Marker({
        position: [property.lng, property.lat],
        title: property.name,
        label: {
          content: `<div style="background:#3498db;color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;white-space:nowrap">${property.name}</div>`,
          direction: 'bottom',
        },
      })
      ;(marker as any)._isSearchResult = true
      marker.on('click', () => {
        setSelectedProperty(property)
        showInfoWindow(property)
      })
      marker.setMap(map)
      markersRef.current.push(marker)
    })
  }, [searchResults])

  useEffect(() => {
    const AMap = (window as any).AMap
    if (!AMap || !mapInstanceRef.current) return
    markersRef.current.forEach((m: any) => { if (m._isLandmark) m.setMap(null) })
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
      ;(marker as any)._isLandmark = true
      marker.setMap(map)
      markersRef.current.push(marker)
    })
  }, [landmarks])

  return (
    <>
      <div ref={mapRef} className="map-container absolute inset-0" style={{ zIndex: 0 }} />
      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 1, background: 'linear-gradient(135deg, #e8f4f8 0%, #d4e8f0 30%, #c8e6c9 60%, #e8f5e9 100%)' }}>
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-gray-500 text-sm">地图加载中...</p>
        </div>
      )}
    </>
  )
}
