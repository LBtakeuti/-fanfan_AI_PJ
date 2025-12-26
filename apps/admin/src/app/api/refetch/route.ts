import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    const workerBaseUrl = process.env.WORKER_BASE_URL || 'http://localhost:8080'
    const workerUrl = workerBaseUrl + '/run?url=' + encodeURIComponent(url)

    console.log('WORKER_BASE_URL:', workerBaseUrl)
    console.log('Calling worker:', workerUrl)

    const response = await fetch(workerUrl)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Refetch error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
