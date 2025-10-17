import dayjs from 'dayjs';

export function toIsoDate(text: string): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, '').replace(/[（）()]/g, '').replace(/[．。]/g, '.').replace(/[：]/g, ':');
  let m = t.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日?/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  m = t.match(/(20\d{2})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  return '';
}

export function toPerformanceTime(text: string): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, '').replace(/[：]/g, ':');
  let m = t.match(/開演\s*(\d{1,2}):?(\d{2})/);
  if (m) return `${pad2(m[1])}:${pad2(m[2])}`;
  m = t.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${pad2(m[1])}:${pad2(m[2])}`;
  m = t.match(/(\d{1,2})時/);
  if (m) return `${pad2(m[1])}:00`;
  return '';
}

export function fillRanges(records: any[]) {
  const byTour = new Map<string, string[]>();
  const byPlace = new Map<string, string[]>();
  for (const r of records) {
    if (!r.date) continue;
    if (!byTour.has(r.tour)) byTour.set(r.tour, []);
    byTour.get(r.tour)!.push(r.date);
    const pk = r.place || '';
    if (!byPlace.has(pk)) byPlace.set(pk, []);
    byPlace.get(pk)!.push(r.date);
  }
  for (const r of records) {
    const tDates = (byTour.get(r.tour) || []).filter(Boolean).sort();
    r.tour_start_date = tDates[0] || '';
    r.tour_end_date   = tDates[tDates.length - 1] || '';
    const pDates = (byPlace.get(r.place || '') || []).filter(Boolean).sort();
    r.place_start_date = pDates[0] || '';
    r.place_end_date   = pDates[pDates.length - 1] || '';
  }
  return records;
}

function pad2(n: string | number){ return String(n).padStart(2,'0'); }