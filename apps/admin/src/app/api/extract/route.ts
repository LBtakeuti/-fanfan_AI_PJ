import { NextRequest, NextResponse } from 'next/server'

/**
 * 本番では直接Playwright実行せず、workerに委譲してください。
 * 開発環境ではローカルのworker extract-apiを叩きます。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''

  // 開発時はローカルの worker extract-api を叩く
  // worker側で pnpm --filter @osikatsu-pro/worker extract-api を実行しておく
  const workerUrl = process.env.WORKER_EXTRACT_API || 'http://localhost:8081'

  try {
    const res = await fetch(`${workerUrl}/extract?url=${encodeURIComponent(url)}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    // worker が起動していない場合は空配列を返す
    console.error('Worker extract API error:', error)
    return NextResponse.json({ rows: [], error: 'Worker service not available' })
  }
}