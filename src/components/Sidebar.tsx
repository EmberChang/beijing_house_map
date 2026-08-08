import { useState, useRef } from 'react'
import { useLandmarkStore } from '../stores/landmarkStore'
import { useFavoritesStore } from '../stores/favoritesStore'
import { useRouteStore } from '../stores/routeStore'
import { searchPOI, planRoute, inputTips } from '../services/amap'
import type { TipItem } from '../services/amap'
import { calculateScore } from '../services/scoreEngine'
import { setMapCalculateHandler } from './MapContainer'
import { useHistoryStore } from '../stores/historyStore'
import type { Landmark, Property, TravelMode, LandmarkCategory } from '../types'
import { LANDMARK_CATEGORIES } from '../types'

const getCategoryDefaults = (cat: LandmarkCategory) =>
  LANDMARK_CATEGORIES.find(c => c.value === cat) || LANDMARK_CATEGORIES[9]

const CATEGORY_LABEL = (cat: LandmarkCategory) => getCategoryDefaults(cat).label

type Tab = 'search' | 'landmarks' | 'favorites' | 'ranking'

export default function Sidebar() {
  const [tab, setTab] = useState<Tab>('search')
  const [keyword, setKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const { landmarks, addLandmark, updateLandmark, removeLandmark } = useLandmarkStore()
  const [editingLm, setEditingLm] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editVisits, setEditVisits] = useState(0)
  const [editCat, setEditCat] = useState<LandmarkCategory>('work')
  const { favorites, removeFavorite, updateScore } = useFavoritesStore()
  const { history, addEntry, clearHistory, exportData } = useHistoryStore()
  const [batchCalculating, setBatchCalculating] = useState(false)
  const {
    searchResults, setSearchResults, setSelectedProperty, selectedProperty,
    propertyRoutes, setPropertyRoutes, setIsLoadingRoutes, scoreConfig, setFocusLocation,
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
      addEntry(property, result)
      updateScore(property.id, result.score.total)
    } catch (err) { console.error('Route calc error:', err) }
    finally { setIsLoadingRoutes(false) }
  }

  const handleBatchCalculate = async () => {
    if (landmarks.length === 0 || favorites.length === 0) return
    setBatchCalculating(true)
    const modes: TravelMode[] = ['driving', 'transit', 'walking']
    for (const fav of favorites) {
      setSelectedProperty(fav)
      const routeMap = new Map()
      for (const landmark of landmarks) {
        const modeMap = new Map()
        for (const mode of modes) {
          const route = await planRoute(
            { lng: fav.lng, lat: fav.lat },
            { lng: landmark.lng, lat: landmark.lat },
            mode
          )
          modeMap.set(mode, route)
          await new Promise((r) => setTimeout(r, 350))
        }
        routeMap.set(landmark.id, modeMap)
      }
      const result = calculateScore(fav, landmarks, routeMap, scoreConfig)
      setPropertyRoutes(result)
      addEntry(fav, result)
      updateScore(fav.id, result.score.total)
    }
    setBatchCalculating(false)
  }

  // ---- 地标表单 ----
  const [showAddLandmark, setShowAddLandmark] = useState(false)
  const [lmName, setLmName] = useState('')
  const [lmAddr, setLmAddr] = useState('')
  const [lmCat, setLmCat] = useState<LandmarkCategory>('work')
  const [lmVisits, setLmVisits] = useState(250)
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
        category: lmCat, weight: 10,
        visitsPerYear: lmVisits,
      })
      setLmName(''); setLmAddr(''); setLmCat('work'); setLmVisits(250); setShowAddLandmark(false)
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
    <div className="absolute top-3 left-3 z-20 w-80 max-h-[calc(100vh-24px)] flex flex-col amap-panel overflow-hidden amap-fade-in">
      {/* Tabs */}
      <div className="amap-tabs shrink-0 px-3">
        {(['search', 'landmarks', 'favorites', 'ranking'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`amap-tab ${tab === t ? 'amap-tab-active' : ''}`}>
            {{ search: '搜索', landmarks: '地标', favorites: '收藏', ranking: '排行' }[t]}
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
              <input type="text" placeholder="搜索任何地点..." value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="amap-input flex-1" />
              <button onClick={handleSearch} disabled={isSearching}
                className="amap-btn amap-btn-primary">
                {isSearching ? '...' : '搜索'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">找到 {searchResults.length} 个结果</p>
                {searchResults.map((p) => (
                  <button key={p.id} onClick={() => setSelectedProperty(p)}
                    className={`w-full text-left p-2.5 rounded-lg text-sm transition-all border ${
                      selectedProperty?.id === p.id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                    }`}>
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
                  className="amap-input" />
                <div className="relative">
                  <input type="text" placeholder="搜索地址..." value={lmAddr}
                    onChange={(e) => handleLmAddrChange(e.target.value)}
                    onFocus={() => { if (lmTips.length > 0) setLmTipsVisible(true) }}
                    onBlur={() => setTimeout(() => setLmTipsVisible(false), 300)}
                    className="amap-input" />
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
                <select value={lmCat} onChange={(e) => {
                    const cat = e.target.value as LandmarkCategory
                    setLmCat(cat)
                    const defaults = getCategoryDefaults(cat)
                    setLmVisits(defaults.defaultVisits)
                  }}
                  className="amap-select">
                  {LANDMARK_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">每年去</span>
                  <input type="number" min={1} max={3650} value={lmVisits}
                    onChange={(e) => setLmVisits(Number(e.target.value) || 1)}
                    className="amap-input w-20 text-center" />
                  <span className="text-xs text-gray-400">次</span>
                </div>
                {lmError && <p className="text-red-500 text-xs">{lmError}</p>}
                <button onClick={handleAddLandmark}
                  className="amap-btn amap-btn-primary w-full">确认添加</button>
              </div>
            )}
            {landmarks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无地标</p>
            ) : landmarks.map((lm) => (
              editingLm === lm.id ? (
                <div key={lm.id} className="space-y-2 p-3 bg-blue-50 rounded-md">
                  <input type="text" value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                  <select value={editCat} onChange={(e) => {
                      const cat = e.target.value as LandmarkCategory
                      setEditCat(cat)
                      setEditVisits(getCategoryDefaults(cat).defaultVisits)
                    }}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm">
                    {LANDMARK_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">每年</span>
                    <input type="number" value={editVisits}
                      onChange={(e) => setEditVisits(Number(e.target.value) || 1)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-center" />
                    <span className="text-xs text-gray-500">次</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      updateLandmark(lm.id, { name: editName, visitsPerYear: editVisits, category: editCat })
                      setEditingLm(null)
                    }} className="flex-1 py-1 text-xs bg-green-500 text-white rounded">保存</button>
                    <button onClick={() => setEditingLm(null)}
                      className="flex-1 py-1 text-xs bg-gray-300 rounded">取消</button>
                  </div>
                </div>
              ) : (
                <div key={lm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => setFocusLocation({ lng: lm.lng, lat: lm.lat })}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{CATEGORY_LABEL(lm.category)}</span>
                      <span className="font-medium text-sm truncate">{lm.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{lm.address} · 每年{lm.visitsPerYear || lm.weight * 30}次</p>
                  </div>
                  <div className="flex gap-1 ml-1">
                    <button onClick={() => {
                      setEditingLm(lm.id); setEditName(lm.name); setEditVisits(lm.visitsPerYear); setEditCat(lm.category)
                    }} className="text-blue-400 hover:text-blue-600 text-xs">✎</button>
                    <button onClick={() => removeLandmark(lm.id)} className="text-red-400 hover:text-red-600">×</button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {tab === 'favorites' && (
          <div className="space-y-2">
            {favorites.length > 0 && (
              <button onClick={handleBatchCalculate} disabled={batchCalculating || landmarks.length === 0}
                className="w-full py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {batchCalculating ? '⏳ 批量计算中...' : '📊 全部重新计算'}
              </button>
            )}
            {favorites.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无收藏<br/><span className="text-xs">在地图上点击标记，选择"收藏"</span></p>
            ) : favorites.map((fav) => (
              <div key={fav.id} className="p-2 bg-gray-50 rounded-md" onClick={() => setFocusLocation({ lng: fav.lng, lat: fav.lat })}>
                <div className="flex items-center justify-between cursor-pointer">
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

        {tab === 'ranking' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{history.length} 条 · 按评分排序</span>
              <div className="flex gap-2">
                <button onClick={() => {
                  const json = exportData()
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'house_map_data.json'
                  a.click(); URL.revokeObjectURL(url)
                }} className="text-xs text-blue-500 hover:text-blue-700">📥 导出</button>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600">清空</button>
                )}
              </div>
            </div>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无计算记录</p>
            ) : [...history].sort((a, b) => b.result.score.total - a.result.score.total).map((item, idx) => (
              <ExpandableHistoryItem key={item.id} item={item} rank={idx + 1} />
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
              <span className="text-gray-600 truncate flex-1">{r.landmarkName}</span>
              <span className="text-gray-800 font-medium ml-2">
                {r.modes.transit ? `${Math.round(r.modes.transit.duration / 60)}min` : '-'}
                <span className="text-gray-300 mx-0.5">|</span>
                {r.modes.driving ? `${Math.round(r.modes.driving.duration / 60)}min` : '-'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 数据路径 */}
      <div className="border-t shrink-0 px-3 py-1.5 text-[10px] text-gray-300">
        💾 data/landmarks.json · favorites.json · history.json
      </div>
    </div>
  )
}

// 可展开的历史排行项
function ExpandableHistoryItem({ item, rank }: { item: any; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const total = item.result.score.total
  const scoreColor = total >= 70 ? 'text-green-600' : total >= 50 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="p-2 bg-gray-50 rounded-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-xs font-bold w-5 text-center ${rank <= 3 ? (rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : 'text-orange-400') : 'text-gray-300'}`}>
            {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
          </span>
          <span className="font-medium text-sm truncate">{item.property.name}</span>
        </div>
        <span className={`text-sm font-bold ml-2 ${scoreColor}`}>{total}</span>
      </div>
      <p className="text-xs text-gray-400 truncate ml-7">{item.property.address}</p>
      <p className="text-xs text-gray-300 ml-7">
        {new Date(item.timestamp).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
      </p>
      {expanded && (
        <div className="mt-2 ml-7 space-y-0.5">
          {item.result.routes.map((r: any) => (
            <div key={r.landmarkId} className="flex justify-between text-xs text-gray-500">
              <span>{r.landmarkName}</span>
              <span>
                🚌{r.modes.transit ? Math.round(r.modes.transit.duration/60)+'min' : '-'}
                &nbsp;🚗{r.modes.driving ? Math.round(r.modes.driving.duration/60)+'min' : '-'}
              </span>
            </div>
          ))}
        </div>
      )}
      {item.result.routes.length > 0 && !expanded && (
        <p className="text-xs text-blue-400 ml-7 mt-1 cursor-pointer" onClick={() => setExpanded(true)}>
          ▶ 展开 {item.result.routes.length} 个地标详情
        </p>
      )}
    </div>
  )
}
