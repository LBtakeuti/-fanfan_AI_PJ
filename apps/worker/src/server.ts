import 'dotenv/config'
import http from 'http'

console.log('Worker starting...')
console.log('Node version:', process.version)
console.log('PORT:', process.env.PORT || '8080')

let runOnce: any, extractOnly: any
try {
  const mod = require('./run')
  runOnce = mod.runOnce
  extractOnly = mod.extractOnly
  console.log('Modules loaded successfully')
} catch (e) {
  console.error('Failed to load modules:', e)
}

const PORT = Number(process.env.PORT || '8080')

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://${req.headers.host}`)

  // Health check endpoint
  if (u.pathname === '/' || u.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (u.pathname === '/run' && u.searchParams.get('url')) {
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

server.listen(PORT, () => console.log('worker listening on', PORT))