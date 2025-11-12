import { describe, it, expect } from 'vitest'
import { eventKey, checksum } from './checksum'

describe('checksum', () => {
  describe('eventKey', () => {
    it('全フィールドを持つオブジェクトからキーを生成', () => {
      const key = eventKey({
        artist: 'Artist A',
        tour: 'Tour 2025',
        place: 'Tokyo Dome',
        date: '2025-10-14',
        performance: '18:30'
      })
      expect(key).toBe('artist a|tour 2025|tokyo dome|2025-10-14|18:30')
    })

    it('一部フィールドが欠けている場合', () => {
      const key = eventKey({
        artist: 'Artist A',
        date: '2025-10-14'
      })
      expect(key).toBe('artist a|||2025-10-14|')
    })

    it('全フィールドが空の場合', () => {
      const key = eventKey({})
      expect(key).toBe('||||')
    })

    it('大文字を小文字に変換', () => {
      const key = eventKey({
        artist: 'ARTIST',
        tour: 'TOUR',
        place: 'PLACE'
      })
      expect(key).toBe('artist|tour|place||')
    })

    it('undefinedは空文字として扱う', () => {
      const key = eventKey({
        artist: undefined,
        tour: undefined,
        place: undefined,
        date: undefined,
        performance: undefined
      })
      expect(key).toBe('||||')
    })
  })

  describe('checksum', () => {
    it('12文字のハッシュを生成', () => {
      const hash = checksum('test|key|data')
      expect(hash).toHaveLength(12)
      expect(hash).toMatch(/^[a-f0-9]{12}$/)
    })

    it('同じ入力に対して同じハッシュを生成', () => {
      const key = 'artist|tour|place|date|time'
      const hash1 = checksum(key)
      const hash2 = checksum(key)
      expect(hash1).toBe(hash2)
    })

    it('異なる入力に対して異なるハッシュを生成', () => {
      const hash1 = checksum('key1')
      const hash2 = checksum('key2')
      expect(hash1).not.toBe(hash2)
    })

    it('空文字でもハッシュを生成', () => {
      const hash = checksum('')
      expect(hash).toHaveLength(12)
      expect(hash).toMatch(/^[a-f0-9]{12}$/)
    })
  })

  describe('統合テスト', () => {
    it('イベントオブジェクトからチェックサムを生成', () => {
      const event = {
        artist: 'Artist A',
        tour: 'Tour 2025',
        place: 'Tokyo Dome',
        date: '2025-10-14',
        performance: '18:30'
      }
      const key = eventKey(event)
      const hash = checksum(key)

      expect(key).toBe('artist a|tour 2025|tokyo dome|2025-10-14|18:30')
      expect(hash).toHaveLength(12)
    })

    it('重複検知のためのユニークキー生成', () => {
      const event1 = {
        artist: 'Artist A',
        tour: 'Tour',
        place: 'Place',
        date: '2025-10-14',
        performance: '18:30'
      }
      const event2 = {
        artist: 'Artist A',
        tour: 'Tour',
        place: 'Place',
        date: '2025-10-14',
        performance: '18:30'
      }
      const event3 = {
        artist: 'Artist A',
        tour: 'Tour',
        place: 'Place',
        date: '2025-10-14',
        performance: '19:00'  // 時刻が異なる
      }

      const key1 = eventKey(event1)
      const key2 = eventKey(event2)
      const key3 = eventKey(event3)

      expect(checksum(key1)).toBe(checksum(key2))  // 同じイベント
      expect(checksum(key1)).not.toBe(checksum(key3))  // 異なるイベント
    })
  })
})

// 簡易テスト（console.assert版）
if (require.main === module) {
  const key = eventKey({
    artist: 'A',
    tour: 'T',
    place: 'P',
    date: '2025-10-14',
    performance: '18:30'
  })
  console.assert(checksum(key).length === 12)
  console.log('checksum tests passed')
}