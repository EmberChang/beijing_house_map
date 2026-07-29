import { useState } from 'react'
import { searchPOI } from '../services/amap'
import { useRouteStore } from '../stores/routeStore'

const QUICK_SEARCHES = [
  { label: '🏘️ 小区', keyword: '小区', types: '120300' },
  { label: '🏗️ 楼盘', keyword: '楼盘', types: '120300' },
  { label: '🏠 新房', keyword: '新房', types: '120300' },
]

export default function SearchPanel() {
  const [keyword, setKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const { setSearchResults, setSelectedProperty } = useRouteStore()

  const handleSearch = async (kw?: string, types?: string) => {
    const q = kw || keyword.trim()
    if (!q) return
    setIsSearching(true)
    try {
      const results = await searchPOI(q, '北京', types || '120300')
      setSearchResults(results)
      if (results.length > 0) {
        setSelectedProperty(results[0])
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">🔍 搜索楼盘</h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="输入楼盘名称（如：朝阳区 小区）..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => handleSearch()}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_SEARCHES.map((qs) => (
          <button
            key={qs.label}
            onClick={() => {
              setKeyword(qs.keyword)
              handleSearch(qs.keyword, qs.types)
            }}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
          >
            {qs.label}
          </button>
        ))}
      </div>
      <SearchResults />
    </div>
  )
}

function SearchResults() {
  const { searchResults, selectedProperty, setSelectedProperty } = useRouteStore()

  if (searchResults.length === 0) return null

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 max-h-48 overflow-y-auto">
      <p className="text-xs text-gray-400 mb-2">
        找到 {searchResults.length} 个结果
      </p>
      <div className="space-y-1">
        {searchResults.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProperty(p)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              selectedProperty?.id === p.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'hover:bg-gray-50 text-gray-700 border border-transparent'
            }`}
          >
            <div className="font-medium truncate">{p.name}</div>
            <div className="text-xs text-gray-400 truncate">{p.address}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
