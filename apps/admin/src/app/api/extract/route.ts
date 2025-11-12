import { NextRequest, NextResponse } from 'next/server'

/**
 * 本番では直接Playwright実行せず、workerに委譲してください。
 * 開発環境ではローカルのworker extract-apiを叩きます。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  const mode = searchParams.get('mode') || ''

  if (!url) {
    return NextResponse.json({ rows: [], error: 'URL is required' }, { status: 400 })
  }

  // 開発時はローカルの worker extract-api を叩く
  const workerUrl = process.env.WORKER_BASE_URL || 'http://localhost:8080'

  try {
    const query = new URLSearchParams({ url })
    if (mode) {
      query.set('mode', mode)
    }
    const res = await fetch(`${workerUrl}/extract?${query.toString()}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    // worker が起動していない場合は空配列を返す
    console.error('Worker extract API error:', error)
    return NextResponse.json({ rows: [], error: 'Worker service not available' })
  }
}