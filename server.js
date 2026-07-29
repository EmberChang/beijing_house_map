import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const PORT = 3001

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 通用读/写 JSON 文件
function readJSON(file) {
  const p = path.join(DATA_DIR, file)
  if (!fs.existsSync(p)) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) }
  catch { return null }
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8')
}

// GET /api/:name - 读取数据
app.get('/api/:name', (req, res) => {
  const data = readJSON(`${req.params.name}.json`)
  res.json(data || [])
})

// PUT /api/:name - 写入数据
app.put('/api/:name', (req, res) => {
  writeJSON(`${req.params.name}.json`, req.body)
  res.json({ ok: true })
})

// 静态文件（生产模式）
const distDir = path.join(__dirname, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`📁 Data server: http://localhost:${PORT}`)
  console.log(`📂 Data dir: ${DATA_DIR}`)
})
