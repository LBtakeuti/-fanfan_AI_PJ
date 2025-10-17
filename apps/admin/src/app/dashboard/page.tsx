'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Source = {
  id: string
  artist_hint: string|null
  source_url: string
  last_crawled_at: string|null
  last_status: string|null
}

export default function Dashboard() {
  const supabase = createClientComponentClient()
  const [items, setItems] = useState<Source[]>([])
  const [url, setUrl] = useState('')
  const [artist, setArtist] = useState('')
  const [out, setOut] = useState('')

  async function load() {
    const { data } = await supabase
      .from('url_sources')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function add() {
    await supabase.from('url_sources').insert({
      source_url: url,
      artist_hint: artist || null
    })
    setUrl('')
    setArtist('')
    load()
  }

  async function refetch(source_url: string) {
    const res = await fetch('/api/refetch', {
      method: 'POST',
      body: JSON.stringify({ url: source_url }),
      headers: { 'content-type': 'application/json' }
    })
    const data = await res.json()
    setOut(data.ok ? '再取得を開始しました' : ('失敗: ' + (data.error || '')))
  }

  async function logout() {
    await supabase.auth.signOut()
    location.href = '/login'
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>URLマスター</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => location.href = '/extract'} style={{ width: 'auto' }}>抽出ツール</button>
          <button onClick={logout} style={{ width: 'auto' }}>ログアウト</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <input
          style={{ width: 240 }}
          placeholder="アーティスト（任意）"
          value={artist}
          onChange={e => setArtist(e.target.value)}
        />
        <button onClick={add}>登録</button>
      </div>
      <p>{out}</p>
      <table style={{ marginTop: 16, width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Artist</th>
            <th align="left">URL</th>
            <th>最終取得</th>
            <th>状態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map(x => (
            <tr key={x.id}>
              <td>{x.artist_hint || ''}</td>
              <td><a href={x.source_url} target="_blank">{x.source_url}</a></td>
              <td>{x.last_crawled_at || '-'}</td>
              <td>{x.last_status || '-'}</td>
              <td><button onClick={() => refetch(x.source_url)}>再取得</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}