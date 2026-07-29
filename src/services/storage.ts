// 存储工具 —— LocalStorage + 静态数据文件 + 后端 API 三层回退
const BACKEND = '/api'
const BASE = import.meta.env.BASE_URL || '/'

async function loadFromBackend(name: string): Promise<any | null> {
  try {
    const res = await fetch(`${BACKEND}/${name}`)
    if (res.ok) return await res.json()
  } catch { /* ignore */ }
  return null
}

async function loadFromStatic(name: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}data/${name}.json`)
    if (res.ok) return await res.json()
  } catch { /* ignore */ }
  return null
}

// 写入（LocalStorage 为主，后端为辅）
export function persist(name: string, data: any): void {
  localStorage.setItem(`house_map_${name}`, JSON.stringify(data))
  // 尝试同步到后端
  try {
    fetch(`${BACKEND}/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch { /* ignore */ }
}

// 读取：LocalStorage → 静态数据文件 → 后端 API
export async function load(name: string): Promise<any | null> {
  // 1. LocalStorage
  const local = localStorage.getItem(`house_map_${name}`)
  if (local) {
    try { return JSON.parse(local) } catch { /* ignore */ }
  }
  // 2. 静态数据文件（生产环境部署的数据）
  const staticData = await loadFromStatic(name)
  if (staticData && (Array.isArray(staticData) ? staticData.length > 0 : true)) {
    localStorage.setItem(`house_map_${name}`, JSON.stringify(staticData))
    return staticData
  }
  // 3. 后端 API
  const backend = await loadFromBackend(name)
  if (backend && (Array.isArray(backend) ? backend.length > 0 : true)) {
    localStorage.setItem(`house_map_${name}`, JSON.stringify(backend))
    return backend
  }
  return null
}
