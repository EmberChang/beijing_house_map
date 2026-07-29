import { useState } from 'react'
import { searchPOI } from '../services/amap'
import { useRouteStore } from '../stores/routeStore'

export default function SearchPanel() {
  const [keyword, setKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const { setSearchResults, setSelectedProperty } = useRouteStore()

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setIsSearching(true)
    try {
      const results = await searchPOI(keyword.trim())
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
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="输入楼盘名称或关键词..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>
    </div>
  )
}
