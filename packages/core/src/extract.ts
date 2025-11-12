import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import ical from 'node-ical';
import { toIsoDate, toPerformanceTime } from './normalize';

export type Candidate = {
  tour?: string;
  place?: string;      // サイト表記をそのまま保存
  date?: string;       // YYYY-MM-DD or ISO-like
  performance?: string;
  artist?: string;
};

export async function extractFromHtml(html: string): Promise<Candidate[]> {
  const $ = cheerio.load(html);
  const textBlocks = getBlocks($);
  const lines = textBlocks.join('\n').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

  const events: Candidate[] = [];
  for (let i=0;i<lines.length;i++){
    const line = sanitize(lines[i]);
    const dateIso = toIsoDate(line);
    if (!dateIso) continue;
    let perf = toPerformanceTime(line) || toPerformanceTime(lines[i+1]||'') || toPerformanceTime(lines[i+2]||'');
    const venue = findVenueNear(lines, i);
    const tour  = guessTour($);
    const artist = guessArtist($);
    events.push({ tour, place: venue, date: dateIso, performance: perf, artist });
  }
  return events;
}

export function extractFromJsonLd(html: string): Candidate[] {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');
  const results: Candidate[] = [];
  scripts.each((_, el) => {
    const txt = ($(el).contents().text() || '').trim();
    if (!txt) return;
    let json:any;
    try{ json = JSON.parse(txt); }catch{ return; }
    const objs = Array.isArray(json) ? json : (json['@graph'] || [json]);
    for (const obj of objs){
      const types = toArray(obj['@type']).map((x:any)=>String(x).toLowerCase());
      if (!types.includes('event')) continue;
      const performer = Array.isArray(obj.performer) ? obj.performer.map((p:any)=>p?.name).filter(Boolean).join(', ')
                       : obj.performer?.name || '';
      const location  = Array.isArray(obj.location) ? (obj.location[0]?.name || '') : (obj.location?.name || '');
      const tourName  = obj.superEvent?.name || obj.isPartOf?.name || obj.name || '';
      const startDate = obj.startDate || '';
      const time = (typeof startDate==='string' && startDate.includes('T')) ? startDate.split('T')[1] : '';
      results.push({ tour: tourName, place: location, date: startDate, performance: time, artist: performer });
    }
  });
  return results;
}

export async function extractFromIcs(icsText: string): Promise<Candidate[]> {
  const data = ical.sync.parseICS(icsText);
  const out: Candidate[] = [];
  for (const k of Object.keys(data)){
    const ev:any = (data as any)[k];
    if (ev.type !== 'VEVENT') continue;
    const d = ev.start instanceof Date ? ev.start.toISOString() : ev.start;
    out.push({
      tour: ev.summary || '',
      place: (ev.location || '').toString(),
      date: d, performance: '',
      artist: ''
    });
  }
  return out;
}

export function extractFromRss(xml: string): Candidate[] {
  const p = new XMLParser({ ignoreAttributes:false });
  const doc:any = p.parse(xml);
  const items = doc?.rss?.channel?.item || doc?.feed?.entry || [];
  const out: Candidate[] = [];
  for (const it of items){
    const title = it.title?.['#text'] || it.title || '';
    const desc  = it.description || it.summary || '';
    const text  = [title, desc].join('\n');
    const date = toIsoDate(text);
    const performance = toPerformanceTime(text);
    const place = guessVenueFromText(text);
    out.push({ tour: title, place, date, performance, artist: '' });
  }
  return out;
}

/** helpers */
function getBlocks($: cheerio.CheerioAPI){
  const sel = ['main','article','section','.content','.post','.entry','.detail'];
  const blocks: string[] = [];
  sel.forEach(s => $(s).each((_,el)=> blocks.push($(el).text()) ));
  if (blocks.length===0) blocks.push($('body').text());
  return blocks.map(t=>t.replace(/\u00a0/g,' '));
}
function sanitize(s:string){ return s.replace(/\s+/g,' ').replace(/[（）\(\)]/g,'').replace(/【.*?】/g,'').replace(/\[.*?\]/g,''); }
function toArray(x:any){ return Array.isArray(x)?x:(x?[x]:[]); }
function venueSuffixRe(){ return /(ホール|ドーム|スタジアム|劇場|会館|シアター|アリーナ|フォーラム|センター|パシフィコ|Zepp|GARDEN|EX THEATER|BIGCAT|サンプラザ|クラブクアトロ)/i; }
function labelRe(){ return /(会場|venue|開催場所)/i; }
function noiseRe(){ return /^(day|open\s*\/\s*start|open|start|area|venue|info|schedule|topics)$/i; }
function isNoiseLine(ln: string){
  const normalized = ln.replace(/[:：\-]/g,'').trim();
  if (!normalized) return true;
  return noiseRe().test(normalized);
}
function findVenueNear(lines:string[], idx:number){
  for (let j=0;j<=6;j++){
    const ln = (lines[idx+j]||'').trim();
    if (!ln) continue;
    if (labelRe().test(ln)) return ln.replace(labelRe(), '').replace(/[:：は\-]/g,'').trim();
    if (venueSuffixRe().test(ln)) return ln.trim();
    if (isNoiseLine(ln)) continue;
  }
  for (let j=1;j<=6;j++){
    const ln = (lines[idx-j]||'').trim();
    if (!ln) continue;
    if (labelRe().test(ln)) return ln.replace(labelRe(), '').replace(/[:：は\-]/g,'').trim();
    if (venueSuffixRe().test(ln)) return ln.trim();
    if (isNoiseLine(ln)) continue;
  }
  return '';
}
function guessVenueFromText(t:string){
  const m = t.match(new RegExp(String(venueSuffixRe()).slice(1,-2)));
  return m ? m[0] : '';
}
function guessTour($: cheerio.CheerioAPI){
  const c:string[] = [];
  $('h1,h2,h3').each((_,el)=> {
    const t = $(el).text().trim();
    if (/[Tt][Oo][Uu][Rr]|ツアー/.test(t)) c.push(t);
  });
  if (c.length>0) return c[0];
  return $('h1').first().text().trim() || $('h2').first().text().trim() || '';
}
function guessArtist($: cheerio.CheerioAPI){
  const sel = $("*:contains('Artist'), *:contains('出演'), *:contains('出演者')").first();
  if (sel && sel.length){
    const next = sel.next().text().trim();
    if (next) return next;
    const parent = sel.parent().text().trim();
    if (parent && parent.length<100) return parent.replace(/(Artist|出演者?|:|：)/g,'').trim();
  }
  return $('h1,h2').first().text().trim() || '';
}