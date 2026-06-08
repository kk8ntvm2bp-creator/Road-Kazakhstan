import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

// Proxy — mount on root, filter by path prefix
const backendProxy = createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
})

app.use('/api', (req, res, next) => {
  req.url = '/api' + req.url
  backendProxy(req, res, next)
})

app.use('/uploads', (req, res, next) => {
  req.url = '/uploads' + req.url
  backendProxy(req, res, next)
})

// Serve static React build
app.use(express.static(join(__dirname, 'dist')))

// SPA fallback
app.use((req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`RoadScan frontend running on http://localhost:${PORT}`)
})
