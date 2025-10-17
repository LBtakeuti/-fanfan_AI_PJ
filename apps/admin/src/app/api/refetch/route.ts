import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  const base = process.env.WORKER_BASE_URL || 'http://localhost:8080'

  try {
    const res = await fetch(`${base}/run?url=${encodeURIComponent(url)}`, {
      method: 'GET'  // server.tsは GET で実装されている
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Worker service not available' })
  }
}