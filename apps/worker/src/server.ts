// Only load dotenv in development (when SUPABASE_URL is not set)
if (!process.env.SUPABASE_URL) {
  require('dotenv/config')
}
import http from 'http'

console.log('=== Worker Starting ===')
console.log('Node version:', process.version)
console.log('PORT:', process.env.PORT || '8080')

// Lazy load run module to prevent startup failures
let runOnce: any = null
let extractOnly: any = null

const loadModules = async () => {
  if (!runOnce) {
    try {
      const mod = await import('./run.js')
      runOnce = mod.runOnce
      extractOnly = mod.extractOnly
      console.log('Run module loaded successfully')
    } catch (e) {
      console.error('Failed to load run module:', e)
    }
  }
}

const PORT = Number(process.env.PORT || '8080')

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://${req.headers.host}`)
  console.log(`[${new Date().toISOString()}] ${req.method} ${u.pathname}`)

  // Health check endpoint - respond immediately
  if (u.pathname === '/' || u.pathname === '/health') {
    console.log('Health check requested')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
    return
  }

  // Load modules on first real request
  await loadModules()

  if (u.pathname === '/run' && u.searchParams.get('url')) {
    if (!runOnce) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Module not loaded' }))
      return
    }
    const url = u.searchParams.get('url')!
    try {
      const n = await runOnce(url)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, count: n }))
    } catch (e: any) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }))
    }
    return
  }

  if (u.pathname === '/extract' && u.searchParams.get('url')) {
    if (!extractOnly) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ rows: [], error: 'Module not loaded' }))
      return
    }
    const url = u.searchParams.get('url')!
    const mode = u.searchParams.get('mode') || 'auto'
    try {
      const useAi = mode === 'ai' || mode === 'auto'
      const { records, usedAi, aiTried } = await extractOnly(url, { useAi: useAi })
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ rows: records, usedAi, aiTried }))
    } catch (e: any) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ rows: [], error: String(e?.message || e) }))
    }
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('=== Worker Ready ===')
  console.log(`Listening on 0.0.0.0:${PORT}`)
})
