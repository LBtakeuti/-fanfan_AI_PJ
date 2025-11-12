'use client'
import { useState } from 'react'
import { stringify } from 'csv-stringify/browser/esm/sync'
import { CsvPreviewModal } from '../components/csv-preview-modal'
import {
  buildGenbaCsv,
  buildPerformanceCsv,
  buildTourCsv,
  type CsvEventInput
} from '../utils/csv-format'

type Event = {
  tour: string
  tour_start_date: string
  tour_end_date: string
  place: string
  place_start_date: string
  place_end_date: string
  date: string
  performance: string
  artist: string
  source_url: string
}

export default function ExtractPage() {
  const [url, setUrl] = useState('')
  const [rows, setRows] = useState<Event[]>([])
  const [checks, setChecks] = useState<boolean[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiConfirm, setShowAiConfirm] = useState(false)
  const [usingAi, setUsingAi] = useState(false)
  const [detailEvent, setDetailEvent] = useState<CsvEventInput | null>(null)

  const isProcessing = loading || aiLoading

  async function run() {
    if (loading || aiLoading) return
    if (!url.trim()) {
      setError('URLを入力してください')
      return
    }

    setError('')
    setShowAiConfirm(false)
    setUsingAi(false)
    setLoading(true)

    try {
      const res = await fetch('/api/extract?url=' + encodeURIComponent(url) + '&mode=normal')
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setRows([])
        setChecks([])
      } else {
        setRows(data.rows || [])
        setChecks((data.rows || []).map(() => true))
        setUsingAi(Boolean(data.usedAi))
        if (!data.rows || data.rows.length === 0) {
          setError('イベント情報が見つかりませんでした。AIによる取得を試しますか？')
          setShowAiConfirm(true)
        }
      }
    } catch (err) {
      setError('情報の取得に失敗しました。Workerサービスが起動しているか確認してください。')
      setRows([])
      setChecks([])
      setShowAiConfirm(false)
      setUsingAi(false)
    } finally {
      setLoading(false)
    }
  }

  async function runAi() {
    if (loading || aiLoading) return
    if (!url.trim()) {
      setError('URLを入力してください')
      return
    }

    setShowAiConfirm(false)
    setError('')
    setUsingAi(false)
    setAiLoading(true)

    try {
      const res = await fetch('/api/extract?url=' + encodeURIComponent(url) + '&mode=ai')
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setRows([])
        setChecks([])
      } else {
        const nextRows: Event[] = data.rows || []
        setRows(nextRows)
        setChecks(nextRows.map(() => true))
        setUsingAi(Boolean(data.usedAi))
        if (nextRows.length === 0) {
          setError('AIでもイベント情報を取得できませんでした。')
        }
      }
    } catch (err) {
      setError('AIによる情報取得に失敗しました。設定やAPIキーを確認してください。')
      setRows([])
      setChecks([])
      setUsingAi(false)
    } finally {
      setAiLoading(false)
    }
  }

  // ツアーマスタCSV出力
  function toTourMasterCSV() {
    const selected = rows.filter((_, i) => checks[i])

    const spec = buildTourCsv(toCsvInputs(selected))
    const csv = '\ufeff' + stringify([spec.headers, ...spec.rows])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ツアーマスタ.csv`
    a.click()
  }

  // 現場マスタCSV出力
  function toGenbaMasterCSV() {
    const selected = rows.filter((_, i) => checks[i])

    const spec = buildGenbaCsv(toCsvInputs(selected))
    const csv = '\ufeff' + stringify([spec.headers, ...spec.rows])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `現場マスタ.csv`
    a.click()
  }

  // 公演マスタCSV出力
  function toPerformanceMasterCSV() {
    const selected = rows.filter((_, i) => checks[i])

    const spec = buildPerformanceCsv(toCsvInputs(selected))
    const csv = '\ufeff' + stringify([spec.headers, ...spec.rows])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `公演マスタ.csv`
    a.click()
  }

  function toCsvInputs(events: Event[]): CsvEventInput[] {
    return events.map(e => ({
      tour: e.tour,
      place: e.place,
      date: e.date,
      performance: e.performance,
      artist: e.artist
    }))
  }

  function selectAll() {
    setChecks(rows.map(() => true))
  }

  function deselectAll() {
    setChecks(rows.map(() => false))
  }

  function openDetailModal(event: Event) {
    setDetailEvent({
      tour: event.tour,
      place: event.place,
      date: event.date,
      performance: event.performance,
      artist: event.artist
    })
  }

  function closeDetailModal() {
    setDetailEvent(null)
  }



  return (
    <div className="dashboard-container">
      <div className="main-content" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="btn-secondary btn-sm" 
              onClick={() => location.href = '/dashboard'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← ダッシュボードに戻る
            </button>
            <div className="main-title">イベント情報抽出ツール</div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary btn-sm" onClick={() => location.href = '/dashboard'}>
              ダッシュボード
            </button>
          </div>
        </div>

        <div className="main-body">
          {/* URL入力カード */}
          <div className="card">
            <div className="card-title">公演情報を抽出</div>
            <div className="card-description">
              アーティストの公式サイトURLを入力してください。自動的にイベント情報を抽出します。
            </div>
            <div className="form-group">
              <label className="form-label">公式サイトのURL</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://www.yoasobi-music.jp/schedule"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !isProcessing && run()}
                  disabled={isProcessing}
                />
                <button
                  className="btn-primary"
                  onClick={run}
                  disabled={isProcessing}
                  style={{ minWidth: '120px' }}
                >
                  {loading ? '取得中...' : '情報を取得'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={runAi}
                  disabled={isProcessing}
                  style={{ minWidth: '140px' }}
                >
                  {aiLoading ? 'AI取得中...' : 'AIで取得'}
                </button>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* ローディング */}
          {isProcessing && (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loading-spinner"></div>
                <div style={{ marginTop: '16px', color: '#6b7280' }}>
                  情報を取得しています...
                </div>
              </div>
            </div>
          )}

          {/* AI情報 */}
          {!isProcessing && usingAi && rows.length > 0 && (
            <div className="alert alert-info">
              AIによる抽出結果を表示しています。
            </div>
          )}

          {/* 結果テーブル */}
          {!isProcessing && rows.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="card-title" style={{ margin: 0 }}>
                  抽出結果 ({rows.filter((_, i) => checks[i]).length}/{rows.length}件選択中)
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary btn-sm" onClick={selectAll}>
                    すべて選択
                  </button>
                  <button className="btn-secondary btn-sm" onClick={deselectAll}>
                    選択解除
                  </button>
                  <button
                    className="btn-primary btn-sm"
                    onClick={toTourMasterCSV}
                    disabled={!rows.filter((_, i) => checks[i]).length}
                  >
                    ツアーマスタCSV
                  </button>
                  <button
                    className="btn-primary btn-sm"
                    onClick={toGenbaMasterCSV}
                    disabled={!rows.filter((_, i) => checks[i]).length}
                  >
                    現場マスタCSV
                  </button>
                  <button
                    className="btn-primary btn-sm"
                    onClick={toPerformanceMasterCSV}
                    disabled={!rows.filter((_, i) => checks[i]).length}
                  >
                    公演マスタCSV
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={checks.length > 0 && checks.every(c => c)}
                          onChange={e => setChecks(rows.map(() => e.target.checked))}
                        />
                      </th>
                      <th>ツアー名</th>
                      <th>会場</th>
                      <th>日付</th>
                      <th>開演時刻</th>
                      <th>アーティスト</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={checks[i] ? 'selected' : ''}
                        onClick={() => openDetailModal(r)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={checks[i]}
                            onChange={e => {
                              e.stopPropagation()
                              const newChecks = [...checks]
                              newChecks[i] = e.target.checked
                              setChecks(newChecks)
                            }}
                          />
                        </td>
                        <td>{r.tour || '-'}</td>
                        <td>{r.place || '-'}</td>
                        <td>{r.date || '-'}</td>
                        <td>{r.performance || '-'}</td>
                        <td>{r.artist || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 空の状態 */}
          {!isProcessing && !error && rows.length === 0 && url === '' && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">イベント情報を抽出</div>
                <div className="empty-state-text">
                  アーティストの公式サイトURLを入力して、「情報を取得」ボタンを押してください。<br/>
                  自動的にイベント・ライブ・コンサート情報を抽出します。
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showAiConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(15,23,42,0.12)'
            }}
          >
            <div className="card-title" style={{ marginBottom: '12px' }}>
              AIで情報を取得しますか？
            </div>
            <div style={{ color: '#4b5563', marginBottom: '20px', lineHeight: 1.6 }}>
              通常のスクレイピングではイベント情報を検出できませんでした。AI補助で抽出を試みると追加コストが発生する場合があります。続行しますか？
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowAiConfirm(false)}
              >
                いいえ
              </button>
              <button
                className="btn-primary"
                onClick={runAi}
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
      {detailEvent && (
        <CsvPreviewModal event={detailEvent} onClose={closeDetailModal} />
      )}
    </div>
  )
}
