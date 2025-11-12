import { describe, it, expect } from 'vitest'
import { toIsoDate, toPerformanceTime, fillRanges } from './normalize'

describe('normalize', () => {
  describe('toIsoDate', () => {
    it('日本語形式の日付をISO形式に変換', () => {
      expect(toIsoDate('2025年10月14日(火)')).toBe('2025-10-14')
      expect(toIsoDate('2025年1月1日')).toBe('2025-01-01')
      expect(toIsoDate('2025年12月31日')).toBe('2025-12-31')
    })

    it('スラッシュ区切りの日付をISO形式に変換', () => {
      expect(toIsoDate('2025/10/14')).toBe('2025-10-14')
      expect(toIsoDate('2025/1/1')).toBe('2025-01-01')
    })

    it('ドット区切りの日付をISO形式に変換', () => {
      expect(toIsoDate('2025.10.14')).toBe('2025-10-14')
      expect(toIsoDate('2025.1.1')).toBe('2025-01-01')
    })

    it('ハイフン区切りの日付をISO形式に変換', () => {
      expect(toIsoDate('2025-10-14')).toBe('2025-10-14')
      expect(toIsoDate('2025-1-1')).toBe('2025-01-01')
    })

    it('無効な入力の場合は空文字を返す', () => {
      expect(toIsoDate('')).toBe('')
      expect(toIsoDate('invalid')).toBe('')
      expect(toIsoDate('2025')).toBe('')
    })
  })

  describe('toPerformanceTime', () => {
    it('開演時刻を標準形式に変換', () => {
      expect(toPerformanceTime('開演 18:30')).toBe('18:30')
      expect(toPerformanceTime('開演18:30')).toBe('18:30')
      expect(toPerformanceTime('開演 9:00')).toBe('09:00')
    })

    it('時刻のみの形式を標準形式に変換', () => {
      expect(toPerformanceTime('18:30')).toBe('18:30')
      expect(toPerformanceTime('9:00')).toBe('09:00')
      expect(toPerformanceTime('18：30')).toBe('18:30')  // 全角コロン
    })

    it('時のみの形式を標準形式に変換', () => {
      expect(toPerformanceTime('18時')).toBe('18:00')
      expect(toPerformanceTime('9時')).toBe('09:00')
    })

    it('無効な入力の場合は空文字を返す', () => {
      expect(toPerformanceTime('')).toBe('')
      expect(toPerformanceTime('invalid')).toBe('')
      expect(toPerformanceTime('開演')).toBe('')
    })
  })

  describe('fillRanges', () => {
    it('ツアーと会場の日程範囲を計算', () => {
      const records = [
        { tour: 'Tour A', place: 'Hall 1', date: '2025-10-14' },
        { tour: 'Tour A', place: 'Hall 1', date: '2025-10-15' },
        { tour: 'Tour A', place: 'Hall 2', date: '2025-10-20' },
      ]

      const result = fillRanges(records)

      expect(result[0].tour_start_date).toBe('2025-10-14')
      expect(result[0].tour_end_date).toBe('2025-10-20')
      expect(result[0].place_start_date).toBe('2025-10-14')
      expect(result[0].place_end_date).toBe('2025-10-15')

      expect(result[2].place_start_date).toBe('2025-10-20')
      expect(result[2].place_end_date).toBe('2025-10-20')
    })

    it('日付がない場合は空文字を設定', () => {
      const records = [
        { tour: 'Tour A', place: 'Hall 1', date: '' },
      ]

      const result = fillRanges(records)

      expect(result[0].tour_start_date).toBe('')
      expect(result[0].tour_end_date).toBe('')
      expect(result[0].place_start_date).toBe('')
      expect(result[0].place_end_date).toBe('')
    })

    it('空配列の場合はそのまま返す', () => {
      expect(fillRanges([])).toEqual([])
    })
  })
})

// 簡易テスト（console.assert版）
if (require.main === module) {
  console.assert(toIsoDate('2025年10月14日(火)') === '2025-10-14')
  console.assert(toPerformanceTime('開演 18:30') === '18:30')
  console.log('normalize tests passed')
}