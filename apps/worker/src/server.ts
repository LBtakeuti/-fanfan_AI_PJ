import 'dotenv/config'
import http from 'http'
import { runOnce } from './run'

const PORT = Number(process.env.PORT || '8080')

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://${req.headers.host}`)

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

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => console.log('worker listening on', PORT))