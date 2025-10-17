import 'dotenv/config'
import http from 'http'
import { canFetch, fetchRenderedHtml, checkRateLimit } from './fetcher'
import { extractFromJsonLd, extractFromHtml } from '@core/extract'
import { fillRanges } from '@core/normalize'
import { eventKey, checksum } from '@core/checksum'

const PORT = Number(process.env.EXTRACT_PORT || '8081')

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://${req.headers.host}`)

  // CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (u.pathname === '/extract' && u.searchParams.get('url')) {
    const url = u.searchParams.get('url')!
    try {
      // レート制限チェック
      const rateOk = await checkRateLimit(url)
      if (!rateOk) throw new Error('Rate limit exceeded for this host')

      // robots.txtチェック
      const allowed = await canFetch(url)
      if (!allowed) throw new Error('robots.txt disallow')

      const { html, finalUrl } = await fetchRenderedHtml(url)
      let cands = extractFromJsonLd(html)
      if (!cands.length) cands = await extractFromHtml(html)

      const records = fillRanges(cands.map(c => ({
        tour: (c.tour || '').trim(),
        tour_start_date: '',
        tour_end_date: '',
        place: (c.place || '').trim(),
        place_start_date: '',
        place_end_date: '',
        date: c.date ? c.date.split('T')[0] : '',
        performance: (c.performance || '').slice(0, 5),
        artist: (c.artist || '').trim(),
        source_url: finalUrl
      })))

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ rows: records }))
    } catch (e: any) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ rows: [], error: String(e?.message || e) }))
    }
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => console.log('extract API listening on', PORT))