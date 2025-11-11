'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CsvPreviewModal } from '../components/csv-preview-modal'
import type { CsvEventInput } from '../utils/csv-format'

type Source = {
  id: string
  artist_hint: string|null
  source_url: string
  last_crawled_at: string|null
  last_status: string|null
  created_at: string
}

type Event = {
  id: string
  tour: string|null
  place: string|null
  date: string
  performance: string|null
  artist: string|null
  source_url: string
}


function formatJapanTime(value: string | null) {
  if (!value) return '未取得'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return `${formatter.format(date)} JST`
}

export default function Dashboard() {
  const supabase = createClientComponentClient()
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState<Source|null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [url, setUrl] = useState('')
  const [artist, setArtist] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success'|'error'|'info'>('info')
  const [detailEvent, setDetailEvent] = useState<CsvEventInput | null>(null)

  async function loadSources() {
    const { data } = await supabase
      .from('url_sources')
      .select('*')
      .order('created_at', { ascending: false })
    setSources(data || [])
  }

  async function loadEvents(sourceUrl: string) {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('source_url', sourceUrl)
      .order('date', { ascending: true })
    setEvents(data || [])
  }

  useEffect(() => {
    loadSources()
  }, [])

  async function addSource() {
    if (!url.trim()) {
      showMessage('URLを入力してください', 'error')
      return
    }

    const { error } = await supabase.from('url_sources').insert({
      source_url: url.trim(),
      artist_hint: artist.trim() || null
    })

    if (error) {
      showMessage('登録に失敗しました: ' + error.message, 'error')
    } else {
      showMessage('URLを登録しました', 'success')
      setUrl('')
      setArtist('')
      loadSources()
    }
  }

  async function refetch(source: Source) {
    showMessage('情報を取得中...', 'info')

    const res = await fetch('/api/refetch', {
      method: 'POST',
      body: JSON.stringify({ url: source.source_url }),
      headers: { 'content-type': 'application/json' }
    })

    const data = await res.json()

    if (data.ok) {
      showMessage('情報の取得を開始しました', 'success')
      // 少し待ってからデータを再読み込み
      setTimeout(() => {
        loadSources()
        if (selectedSource?.id === source.id) {
          loadEvents(source.source_url)
        }
      }, 2000)
    } else {
      showMessage('取得に失敗しました: ' + (data.error || '不明なエラー'), 'error')
    }
  }

  async function deleteSource(source: Source) {
    if (!confirm(`${source.artist_hint || source.source_url} を削除しますか？`)) {
      return
    }

    const { error } = await supabase
      .from('url_sources')
      .delete()
      .eq('id', source.id)

    if (error) {
      showMessage('削除に失敗しました: ' + error.message, 'error')
    } else {
      showMessage('削除しました', 'success')
      if (selectedSource?.id === source.id) {
        setSelectedSource(null)
        setEvents([])
      }
      loadSources()
    }
  }

  function openEventDetail(event: Event) {
    setDetailEvent({
      tour: event.tour,
      place: event.place,
      date: event.date,
      performance: event.performance,
      artist: event.artist || selectedSource?.artist_hint || ''
    })
  }

  function closeEventDetail() {
    setDetailEvent(null)
  }

  function selectSource(source: Source) {
    setSelectedSource(source)
    loadEvents(source.source_url)
  }

  function showMessage(msg: string, type: 'success'|'error'|'info') {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  async function logout() {
    await supabase.auth.signOut()
    location.href = '/login'
  }

  function getStatusBadgeClass(status: string|null) {
    if (!status) return 'pending'
    if (status.includes('success')) return 'success'
    if (status.includes('failed') || status.includes('error')) return 'failed'
    return 'pending'
  }

  return (
    <div className="dashboard-container">
      {/* 左サイドバー */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">アーティスト</div>
          <div className="sidebar-subtitle">登録済み URL一覧</div>
        </div>

        <div className="sidebar-content">
          {sources.length === 0 ? (
            <div className="artist-list-empty">
              まだURLが登録されていません。<br/>
              右側のフォームから追加してください。
            </div>
          ) : (
            sources.map(source => (
              <div
                key={source.id}
                className={`artist-item ${selectedSource?.id === source.id ? 'active' : ''}`}
                onClick={() => selectSource(source)}
              >
                <div className="artist-name">
                  {source.artist_hint || '名前未設定'}
                </div>
                <div className="artist-url">
                  {source.source_url}
                </div>
                <div className="artist-status">
                  <span className={`status-badge ${getStatusBadgeClass(source.last_status)}`}>
                    {source.last_status || '未取得'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="main-content">
        <div className="main-header">
          <div className="main-title">
            {selectedSource ? (selectedSource.artist_hint || 'アーティスト詳細') : 'イベント情報管理'}
          </div>
          <div className="header-actions">
            <button className="btn-secondary btn-sm" onClick={() => location.href = '/extract'}>
              抽出ツール
            </button>
            <button className="btn-secondary btn-sm" onClick={logout}>
              ログアウト
            </button>
          </div>
        </div>

        <div className="main-body">
          {message && (
            <div className={`alert alert-${messageType}`}>
              {message}
            </div>
          )}

          {/* URL登録フォーム */}
          <div className="card">
            <div className="card-title">新しいアーティストを登録</div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">公式サイトのURL</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://example.com/schedule"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSource()}
                />
              </div>
              <div className="form-group">
                <label className="form-label">アーティスト名（任意）</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="例: YOASOBI"
                  value={artist}
                  onChange={e => setArtist(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSource()}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={addSource}>
              登録して情報を取得
            </button>
          </div>

          {/* 選択中のアーティスト詳細 */}
          {selectedSource && (
            <div className="card">
              <div className="card-title">アーティスト詳細</div>
              <div className="form-group">
                <label className="form-label">公式サイトURL</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <a href={selectedSource.source_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                    {selectedSource.source_url}
                  </a>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">最終取得日時</label>
                  <div>{formatJapanTime(selectedSource.last_crawled_at)}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">取得状況</label>
                  <div>
                    <span className={`status-badge ${getStatusBadgeClass(selectedSource.last_status)}`}>
                      {selectedSource.last_status || '未取得'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-primary" onClick={() => refetch(selectedSource)}>
                  最新情報を取得
                </button>
                <button className="btn-danger" onClick={() => deleteSource(selectedSource)}>
                  削除
                </button>
              </div>
            </div>
          )}

          {/* イベント情報一覧 */}
          {selectedSource && (
            <div className="card">
              <div className="card-title">
                取得したイベント情報 ({events.length}件)
              </div>
              {events.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-title">イベント情報がありません</div>
                  <div className="empty-state-text">
                    「最新情報を取得」ボタンを押してデータを取得してください
                  </div>
                </div>
              ) : (
                <div className="event-list">
                  {events.map(event => (
                    <div
                      key={event.id}
                      className="event-card"
                      onClick={() => openEventDetail(event)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="event-header">
                        <div className="event-tour">{event.tour || '公演情報'}</div>
                      </div>
                      <div className="event-details">
                        <div className="event-detail-item">
                          <div className="event-detail-label">日付</div>
                          <div className="event-detail-value">{event.date}</div>
                        </div>
                        <div className="event-detail-item">
                          <div className="event-detail-label">開演時刻</div>
                          <div className="event-detail-value">{event.performance || '未定'}</div>
                        </div>
                        <div className="event-detail-item">
                          <div className="event-detail-label">会場</div>
                          <div className="event-detail-value">{event.place || '未定'}</div>
                        </div>
                        <div className="event-detail-item">
                          <div className="event-detail-label">アーティスト</div>
                          <div className="event-detail-value">{event.artist || selectedSource?.artist_hint || '-'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {detailEvent && (
          <CsvPreviewModal event={detailEvent} onClose={closeEventDetail} />
        )}
      </div>
    </div>
  )
}
