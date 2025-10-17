'use client'
import { useState } from 'react'
import { stringify } from 'csv-stringify/browser/esm/sync'

export default function ExtractPage() {
  const [url, setUrl] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [checks, setChecks] = useState<boolean[]>([])

  async function run() {
    const res = await fetch('/api/extract?url=' + encodeURIComponent(url))
    const data = await res.json()
    setRows(data.rows || [])
    setChecks((data.rows || []).map(() => true))
  }

  function toCSV() {
    const cols = [
      'tour',
      'tour_start_date',
      'tour_end_date',
      'place',
      'place_start_date',
      'place_end_date',
      'date',
      'performance',
      'artist',
      'source_url'
    ]
    const selected = rows.filter((_, i) => checks[i])
    const csv = '\ufeff' + stringify([cols, ...selected.map(r => cols.map(c => r[c] || ''))])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'events.csv'
    a.click()
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>抽出→CSV</h1>
        <button onClick={() => location.href = '/dashboard'} style={{ width: 'auto' }}>URLマスターへ</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <button onClick={run}>取得</button>
        <button onClick={toCSV} disabled={!rows.length}>CSV出力</button>
      </div>
      <table style={{ marginTop: 16, width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['採用', 'tour', 'place', 'date', 'performance', 'artist'].map(h => (
              <th key={h} align="left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={e => {
                    const a = [...checks]
                    a[i] = e.target.checked
                    setChecks(a)
                  }}
                />
              </td>
              <td>{r.tour}</td>
              <td>{r.place}</td>
              <td>{r.date}</td>
              <td>{r.performance}</td>
              <td>{r.artist}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}