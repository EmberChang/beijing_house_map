// 后端同步工具 —— 数据同时保存到 LocalStorage 和本地磁盘 JSON 文件
const BACKEND = '/api'

async function syncToBackend(name: string, data: any): Promise<void> {
  try {
    await fetch(`${BACKEND}/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    // 后端不可用时静默失败，LocalStorage 仍可用
  }
}

async function loadFromBackend(name: string): Promise<any | null> {
  try {
    const res = await fetch(`${BACKEND}/${name}`)
    if (res.ok) return await res.json()
  } catch { /* ignore */ }
  return null
}

// 双写：LocalStorage + 后端磁盘文件
export function persist(name: string, data: any): void {
  localStorage.setItem(`house_map_${name}`, JSON.stringify(data))
  syncToBackend(name, data)
}

// 双读：优先后端，回退 LocalStorage
export async function load(name: string): Promise<any | null> {
  const backend = await loadFromBackend(name)
  if (backend && (Array.isArray(backend) ? backend.length > 0 : true)) {
    // 同步到 LocalStorage
    localStorage.setItem(`house_map_${name}`, JSON.stringify(backend))
    return backend
  }
  // 回退
  const local = localStorage.getItem(`house_map_${name}`)
  if (local) {
    try { return JSON.parse(local) } catch { /* ignore */ }
  }
  return null
}
