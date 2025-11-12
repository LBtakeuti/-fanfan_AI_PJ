export type CsvSpec = {
  headers: string[]
  rows: string[][]
}

export type CsvEventInput = {
  tour?: string | null
  place?: string | null
  date?: string | null
  performance?: string | null
  artist?: string | null
}

function normalize(value?: string | null): string {
  return (value ?? '').trim()
}

function normalizeDate(value?: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.includes('T') ? trimmed.split('T')[0] : trimmed
}

function normalizeDateTime(value?: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.includes('T')) return trimmed
  return `${trimmed}T00:00:00Z`
}

function buildTourRows(events: CsvEventInput[]): string[][] {
  const tourMap = new Map<string, { tour: string; artist: string; dates: string[] }>()

  events.forEach(event => {
    const tour = normalize(event.tour)
    const artist = normalize(event.artist)
    const key = `${tour}_${artist}`
    if (!tourMap.has(key)) {
      tourMap.set(key, { tour, artist, dates: [] })
    }
    const date = normalizeDate(event.date)
    if (date) {
      tourMap.get(key)!.dates.push(date)
    }
  })

  return Array.from(tourMap.values()).map(item => {
    const dates = item.dates.slice().sort()
    const startDate = dates[0] ?? ''
    const endDate = dates.length > 0 ? dates[dates.length - 1] : ''
    return [
      '',
      item.tour,
      item.artist,
      startDate ? normalizeDateTime(startDate) : '',
      endDate ? normalizeDateTime(endDate) : '',
      '',
      '有効',
      '0'
    ]
  })
}

function buildGenbaRows(events: CsvEventInput[]): string[][] {
  const genbaMap = new Map<string, { tour: string; artist: string; place: string; dates: string[] }>()

  events.forEach(event => {
    const tour = normalize(event.tour)
    const artist = normalize(event.artist)
    const place = normalize(event.place)
    const key = `${tour}_${artist}_${place}`
    if (!genbaMap.has(key)) {
      genbaMap.set(key, { tour, artist, place, dates: [] })
    }
    const date = normalizeDate(event.date)
    if (date) {
      genbaMap.get(key)!.dates.push(date)
    }
  })

  return Array.from(genbaMap.values()).map(item => {
    const dates = item.dates.slice().sort()
    const startDate = dates[0] ?? ''
    const endDate = dates.length > 0 ? dates[dates.length - 1] : ''
    const genbaName = `${item.tour} ${item.place}`.trim()
    return [
      '',
      '',
      genbaName,
      '',
      '',
      startDate ? normalizeDateTime(startDate) : '',
      endDate ? normalizeDateTime(endDate) : '',
      '',
      item.tour,
      item.place,
      '公式',
      item.artist,
      '',
      '',
      '',
      '公開中'
    ]
  })
}

function buildPerformanceRows(events: CsvEventInput[]): string[][] {
  const grouped = new Map<string, CsvEventInput[]>()

  events.forEach(event => {
    const tour = normalize(event.tour)
    const place = normalize(event.place)
    const key = `${tour}_${place}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(event)
  })

  const rows: string[][] = []

  grouped.forEach(list => {
    list
      .slice()
      .sort((a, b) => {
        const da = Date.parse(normalizeDateTime(a.date) || '')
        const db = Date.parse(normalizeDateTime(b.date) || '')
        if (Number.isNaN(da) && Number.isNaN(db)) return 0
        if (Number.isNaN(da)) return 1
        if (Number.isNaN(db)) return -1
        return da - db
      })
      .forEach((event, index) => {
        rows.push([
          '',
          '',
          '',
          '',
          String(index + 1),
          normalizeDateTime(event.date),
          normalize(event.performance).slice(0, 5),
          '',
          '1',
          '有効',
          '0'
        ])
      })
  })

  return rows
}

export function buildTourCsv(events: CsvEventInput[]): CsvSpec {
  return {
    headers: ['tour_id', 'tour', 'artist_name', 'tour_start_date', 'tour_end_date', 'note', '_status_', '_delete_'],
    rows: buildTourRows(events)
  }
}

export function buildGenbaCsv(events: CsvEventInput[]): CsvSpec {
  return {
    headers: [
      'genba_master_id',
      'user_id',
      'genba_name',
      'tour_id',
      'my_schedule_id',
      'tour_start_date',
      'tour_end_date',
      'image_file',
      'tour_name',
      'place',
      'category',
      'artist_name',
      'publication_start_date',
      'publication_end_date',
      'note',
      '_status_'
    ],
    rows: buildGenbaRows(events)
  }
}

export function buildPerformanceCsv(events: CsvEventInput[]): CsvSpec {
  return {
    headers: [
      'performance_id',
      'genba_master_id',
      'my_schedule_id',
      'user_id',
      'performance_list_number',
      'date',
      'performance',
      'note',
      'check_flag',
      '_status_',
      '_delete_'
    ],
    rows: buildPerformanceRows(events)
  }
}
