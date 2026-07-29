import { useState, useRef } from 'react'
import { useLandmarkStore } from '../stores/landmarkStore'
import { useFavoritesStore } from '../stores/favoritesStore'
import { useRouteStore } from '../stores/routeStore'
import { searchPOI, planRoute, inputTips } from '../services/amap'
import type { TipItem } from '../services/amap'
import { calculateScore } from '../services/scoreEngine'
import { setMapCalculateHandler } from './MapContainer'
import type { Landmark, Property, PropertyRouteResult, TravelMode } from '../types'

const CATEGORY_LABELS: Record<Landmark['category'], string> = {
  home: '🏠 家', my_office: '💼 我的公司', spouse_office: '💼 老婆公司',
  frequent: '⭐ 常去', occasional: '📍 偶尔',
}
const CATEGORY_WEIGHTS: Record<Landmark['category'], number> = {
  home: 10, my_office: 10, spouse_office: 10, frequent: 6, occasional: 3,
}

type Tab = 'search' | 'landmarks' | 'favorites'

export default function Sidebar() {
  const [tab, setTab] = useState<Tab>('search')
  const [keyword, setKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const { landmarks, addLandmark, removeLandmark } = useLandmarkStore()
  const { favorites, removeFavorite } = useFavoritesStore()
  const {
    searchResults, setSearchResults, setSelectedProperty, selectedProperty,
    propertyRoutes, setPropertyRoutes, setIsLoadingRoutes, scoreConfig,
  } = useRouteStore()

  // 注册地图计算回调
  useState(() => {
    setMapCalculateHandler((prop: Property) => {
      handleCalculate(prop)
    })
  })

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setIsSearching(true)
    try {
      const results = await searchPOI(keyword.trim())
      setSearchResults(results)
      if (results.length > 0) setSelectedProperty(results[0])
    } finally { setIsSearching(false) }
  }

  const handleCalculate = async (property: Property) => {
    if (landmarks.length === 0) return
    setSelectedProperty(property)
    setIsLoadingRoutes(true)
    try {
      const routeMap = new Map()
      const modes: TravelMode[] = ['driving', 'transit', 'walking']
      for (const landmark of landmarks) {
        const modeMap = new Map()
        for (const mode of modes) {
          const route = await planRoute(
            { lng: property.lng, lat: property.lat },
            { lng: landmark.lng, lat: landmark.lat },
            mode
          )
          modeMap.set(mode, route)
          await new Promise((r) => setTimeout(r, 350))
        }
        routeMap.set(landmark.id, modeMap)
      }
      const result = calculateScore(property, landmarks, routeMap, scoreConfig)
      setPropertyRoutes(result)
    } catch (err) { console.error('Route calc error:', err) }
    finally { setIsLoadingRoutes(false) }
  }

  // ---- 地标表单 ----
  const [showAddLandmark, setShowAddLandmark] = useState(false)
  const [lmName, setLmName] = useState('')
  const [lmAddr, setLmAddr] = useState('')
  const [lmCat, setLmCat] = useState<Landmark['category']>('frequent')
  const [lmVisits, setLmVisits] = useState(200)
  const [lmError, setLmError] = useState('')
  const [lmTips, setLmTips] = useState<TipItem[]>([])
  const [lmTipsVisible, setLmTipsVisible] = useState(false)
  const lmTipsTimer = useRef<ReturnType<typeof setTimeout>>()
  const lmAddrRef = useRef('')

  const handleLmAddrChange = async (value: string) => {
    setLmAddr(value)
    lmAddrRef.current = value
    if (lmTipsTimer.current) clearTimeout(lmTipsTimer.current)
    if (value.trim().length < 2) { setLmTips([]); setLmTipsVisible(false); return }
    lmTipsTimer.current = setTimeout(async () => {
      try {
        const tips = await inputTips(value)
        // 使用 ref 比较，确保用户没有继续输入
        if (value === lmAddrRef.current) {
          setLmTips(tips)
          setLmTipsVisible(tips.length > 0)
        }
      } catch (err) {
        console.error('Input tips error:', err)
      }
    }, 300)
  }

  const selectTip = (tip: TipItem) => {
    setLmAddr(tip.name + ' ' + tip.address)
    setLmTips([])
    setLmTipsVisible(false)
  }

  const handleAddLandmark = async () => {
    if (!lmName.trim() || !lmAddr.trim()) return
    setLmError('')
    try {
      const { geocode } = await import('../services/amap')
      const geo = await geocode(lmAddr)
      if (!geo) { setLmError('无法解析地址'); return }
      addLandmark({
        id: 'lm_' + Date.now(),
        name: lmName.trim(), address: lmAddr.trim(),
        lng: geo.lng, lat: geo.lat,
        category: lmCat, weight: CATEGORY_WEIGHTS[lmCat],
        visitsPerYear: lmVisits,
      })
      setLmName(''); setLmAddr(''); setLmCat('frequent'); setLmVisits(200); setShowAddLandmark(false)
    } catch { setLmError('添加失败') }
  }

  if (collapsed) {
    return (
      <div className="absolute top-3 left-3 z-20">
        <button onClick={() => setCollapsed(false)}
          className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50">
          ☰
        </button>
      </div>
    )
  }

  return (
    <div className="absolute top-3 left-3 z-20 w-80 max-h-[calc(100vh-24px)] flex flex-col bg-white/95 backdrop-blur rounded-lg shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b shrink-0">
        {(['search', 'landmarks', 'favorites'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {{ search: '🔍 搜索', landmarks: '📍 地标', favorites: '⭐ 收藏' }[t]}
            {t === 'favorites' && favorites.length > 0 &&
              <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{favorites.length}</span>}
          </button>
        ))}
        <button onClick={() => setCollapsed(true)} className="px-2 text-gray-400 hover:text-gray-600">×</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'search' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="text" placeholder="搜索地点（不限类型）..." value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={handleSearch} disabled={isSearching}
                className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50">
                {isSearching ? '...' : '搜索'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">找到 {searchResults.length} 个结果</p>
                {searchResults.map((p) => (
                  <button key={p.id} onClick={() => setSelectedProperty(p)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedProperty?.id === p.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 truncate">{p.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'landmarks' && (
          <div className="space-y-2">
            <button onClick={() => setShowAddLandmark(!showAddLandmark)}
              className="w-full py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              {showAddLandmark ? '取消' : '+ 添加地标'}
            </button>
            {showAddLandmark && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                <input type="text" placeholder="名称（如：我家）" value={lmName}
                  onChange={(e) => setLmName(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                <div className="relative">
                  <input type="text" placeholder="搜索地址..." value={lmAddr}
                    onChange={(e) => handleLmAddrChange(e.target.value)}
                    onFocus={() => { if (lmTips.length > 0) setLmTipsVisible(true) }}
                    onBlur={() => setTimeout(() => setLmTipsVisible(false), 300)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  {lmTipsVisible && lmTips.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                      {lmTips.map((tip, i) => (
                        <button key={tip.id || i}
                          onMouseDown={(e) => { e.preventDefault(); selectTip(tip) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0">
                          <div className="font-medium text-gray-800 truncate">{tip.name}</div>
                          <div className="text-xs text-gray-400 truncate">{tip.address}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select value={lmCat} onChange={(e) => setLmCat(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">每年去</span>
                  <input type="number" min={1} max={3650} value={lmVisits}
                    onChange={(e) => setLmVisits(Number(e.target.value) || 1)}
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm text-center" />
                  <span className="text-xs text-gray-500">次</span>
                </div>
                {lmError && <p className="text-red-500 text-xs">{lmError}</p>}
                <button onClick={handleAddLandmark}
                  className="w-full py-2 bg-green-500 text-white rounded-md text-sm">确认添加</button>
              </div>
            )}
            {landmarks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无地标</p>
            ) : landmarks.map((lm) => (
              <div key={lm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{CATEGORY_LABELS[lm.category]}</span>
                    <span className="font-medium text-sm truncate">{lm.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{lm.address} · 每年{lm.visitsPerYear || lm.weight * 30}次</p>
                </div>
                <button onClick={() => removeLandmark(lm.id)} className="ml-2 text-red-400 hover:text-red-600">×</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'favorites' && (
          <div className="space-y-2">
            {favorites.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无收藏<br/><span className="text-xs">在地图上点击标记，选择"收藏"</span></p>
            ) : favorites.map((fav) => (
              <div key={fav.id} className="p-2 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate flex-1">{fav.name}</span>
                  {fav.score !== undefined && (
                    <span className={`text-sm font-bold ml-2 ${fav.score >= 70 ? 'text-green-600' : fav.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {fav.score.toFixed(0)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{fav.address}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleCalculate(fav)}
                    className="flex-1 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">📊 计算</button>
                  <button onClick={() => removeFavorite(fav.id)}
                    className="flex-1 py-1.5 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 路线结果面板（如果有） */}
      {propertyRoutes && (
        <div className="border-t shrink-0 p-3 max-h-56 overflow-y-auto bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{propertyRoutes.propertyName}</span>
            <span className="text-lg font-bold text-blue-600">{propertyRoutes.score.total}</span>
          </div>
          {propertyRoutes.routes.map((r) => (
            <div key={r.landmarkId} className="flex items-center justify-between py-1 text-xs border-b border-gray-100 last:border-0">
              <span className="text-gray-600">{r.landmarkName}</span>
              <span className="text-gray-800 font-medium">
                {r.modes.transit ? `${Math.round(r.modes.transit.duration / 60)}min` : '-'}
                <span className="text-gray-400 mx-1">|</span>
                {r.modes.driving ? `${Math.round(r.modes.driving.duration / 60)}min` : '-'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
