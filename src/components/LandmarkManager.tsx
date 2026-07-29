import { useState } from 'react'
import { useLandmarkStore } from '../stores/landmarkStore'
import { geocode } from '../services/amap'
import type { Landmark } from '../types'

const CATEGORY_LABELS: Record<Landmark['category'], string> = {
  home: '🏠 家',
  my_office: '💼 我的公司',
  spouse_office: '💼 老婆公司',
  frequent: '⭐ 常去地点',
  occasional: '📍 偶尔去',
}

const CATEGORY_WEIGHTS: Record<Landmark['category'], number> = {
  home: 10,
  my_office: 10,
  spouse_office: 10,
  frequent: 6,
  occasional: 3,
}

export default function LandmarkManager() {
  const { landmarks, addLandmark, removeLandmark } = useLandmarkStore()
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newCategory, setNewCategory] = useState<Landmark['category']>('frequent')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!newName.trim() || !newAddress.trim()) return
    setError('')
    setIsSearching(true)

    try {
      const geo = await geocode(newAddress)
      if (!geo) {
        setError('无法解析该地址，请检查地址是否正确')
        setIsSearching(false)
        return
      }

      const landmark: Landmark = {
        id: `landmark_${Date.now()}`,
        name: newName.trim(),
        address: newAddress.trim(),
        lng: geo.lng,
        lat: geo.lat,
        category: newCategory,
        weight: CATEGORY_WEIGHTS[newCategory],
        visitsPerYear: CATEGORY_WEIGHTS[newCategory] * 30,
      }

      addLandmark(landmark)
      setNewName('')
      setNewAddress('')
      setNewCategory('frequent')
      setIsAdding(false)
    } catch {
      setError('添加失败，请重试')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-h-[60vh] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800">📍 我的地标</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {isAdding ? '取消' : '+ 添加'}
        </button>
      </div>

      {isAdding && (
        <div className="mb-3 p-3 bg-gray-50 rounded-md space-y-2">
          <input
            type="text"
            placeholder="地标名称（如：我家）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="详细地址"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Landmark['category'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={isSearching}
            className="w-full py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {isSearching ? '地址解析中...' : '确认添加'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {landmarks.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            暂无地标，点击"添加"开始设置
          </p>
        ) : (
          landmarks.map((landmark) => (
            <div
              key={landmark.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {CATEGORY_LABELS[landmark.category]}
                  </span>
                  <span className="font-medium text-sm truncate">{landmark.name}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{landmark.address}</p>
              </div>
              <button
                onClick={() => removeLandmark(landmark.id)}
                className="ml-2 text-red-400 hover:text-red-600 text-lg leading-none"
                title="删除"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
