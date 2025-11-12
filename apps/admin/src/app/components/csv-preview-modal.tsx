'use client'

import { useState } from 'react'
import { buildGenbaCsv, buildPerformanceCsv, buildTourCsv, type CsvEventInput, type CsvSpec } from '../utils/csv-format'

function renderCsvTable(spec: CsvSpec) {
  if (!spec.rows.length) {
    return <div style={{ color: '#6b7280' }}>データがありません</div>
  }

  const csvText = [
    spec.headers.join(','),
    ...spec.rows.map(row => row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ fontSize: '13px' }}>
          <thead>
            <tr>
              {spec.headers.map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, idx) => (
                  <td key={idx}>{cell || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <pre
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f3f4f6',
          borderRadius: '8px',
          overflowX: 'auto'
        }}
      >
        {csvText}
      </pre>
    </>
  )
}

export type CsvPreviewModalProps = {
  event: CsvEventInput
  onClose: () => void
}

export function CsvPreviewModal({ event, onClose }: CsvPreviewModalProps) {
  const [tab, setTab] = useState<'tour' | 'genba' | 'performance'>('tour')

  const tourSpec = buildTourCsv([event])
  const genbaSpec = buildGenbaCsv([event])
  const performanceSpec = buildPerformanceCsv([event])

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '12px',
          maxWidth: '820px',
          width: '95%',
          maxHeight: '90%',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(15,23,42,0.16)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>イベントのCSV形式プレビュー</div>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div style={{ color: '#4b5563', marginBottom: '16px' }}>
          このイベントを1件だけ CSV に出力した場合のフォーマットを確認できます。
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary btn-sm ${tab === 'tour' ? 'active' : ''}`}
            onClick={() => setTab('tour')}
          >
            ツアーマスタ形式
          </button>
          <button
            className={`btn-secondary btn-sm ${tab === 'genba' ? 'active' : ''}`}
            onClick={() => setTab('genba')}
          >
            現場マスタ形式
          </button>
          <button
            className={`btn-secondary btn-sm ${tab === 'performance' ? 'active' : ''}`}
            onClick={() => setTab('performance')}
          >
            公演マスタ形式
          </button>
        </div>
        {tab === 'tour' && renderCsvTable(tourSpec)}
        {tab === 'genba' && renderCsvTable(genbaSpec)}
        {tab === 'performance' && renderCsvTable(performanceSpec)}
      </div>
    </div>
  )
}
