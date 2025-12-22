import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import { fetchRenderedHtml, canFetch, checkRateLimit } from './fetcher';
import { extractFromJsonLd, extractFromHtml, extractFromIcs, extractFromRss } from '@core/extract';
import { fillRanges } from '@core/normalize';
import { eventKey, checksum } from '@core/checksum';
import { extractFromAi } from './extract-ai';

// Load environment variables from .env files only in development
// In production (Railway), env vars are already set
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
  dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });
}

const log = pino({ name: 'worker' });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
const CRAWL_COOLDOWN_SECONDS = Number(process.env.CRAWL_COOLDOWN_SECONDS || '10');

async function runOnce(sourceUrl: string){
  // 1) クールダウンチェック（url_sourcesの最終取得時刻を確認）
  const { data: urlSource } = await supabase
    .from('url_sources')
    .select('last_crawled_at')
    .eq('source_url', sourceUrl)
    .single();

  if (urlSource?.last_crawled_at) {
    const lastCrawled = new Date(urlSource.last_crawled_at).getTime();
    const now = Date.now();
    const secondsPassed = (now - lastCrawled) / 1000;
    if (secondsPassed < CRAWL_COOLDOWN_SECONDS) {
      throw new Error(`Cooldown: wait ${Math.ceil(CRAWL_COOLDOWN_SECONDS - secondsPassed)}s`);
    }
  }

  // 2) レート制限チェック
  const rateOk = await checkRateLimit(sourceUrl);
  if (!rateOk) throw new Error('Rate limit exceeded for this host');

  // 3) robots.txtチェック
  const allowed = await canFetch(sourceUrl);
  if (!allowed) throw new Error('robots.txt disallow');

  // 4) レンダリング取得
  let html: string, finalUrl: string;
  try {
    const result = await fetchRenderedHtml(sourceUrl);
    html = result.html;
    finalUrl = result.finalUrl;
  } catch (error) {
    // 失敗時もステータス更新
    await supabase
      .from('url_sources')
      .update({
        last_crawled_at: new Date().toISOString(),
        last_status: 'failed'
      })
      .eq('source_url', sourceUrl);
    throw error;
  }

  // 5) 構造化/ICS/RSS/HTMLの順で抽出（ICS/RSSは後で拡張：ここではJSON-LD/HTML/AI）
  let cands = extractFromJsonLd(html);
  if (!cands.length) cands = await extractFromHtml(html);
  if (!cands.length) cands = await extractFromAi(html);
  const records = fillRanges(cands.map(c => ({
    tour: (c.tour||'').trim(),
    tour_start_date: '',
    tour_end_date: '',
    place: (c.place||'').trim(),        // サイト表記をそのまま
    place_start_date: '',
    place_end_date: '',
    date: c.date ? c.date.split('T')[0] : '',
    performance: (c.performance||'').slice(0,5),
    artist: (c.artist||'').trim(),
    source_url: finalUrl
  })));

  // 6) 重複回避（artist|tour|place|date|performance ユニーク）
  const uniqueMap = new Map<string, any>();
  for (const r of records){
    const k = eventKey(r);
    if (uniqueMap.has(k)) continue;
    uniqueMap.set(k, { ...r, checksum: checksum(k) });
  }
  const uniques = Array.from(uniqueMap.values());

  // 7) 既存データのチェックサムを取得（効率化のため）
  const checksums = uniques.map(r => r.checksum);
  const { data: existing } = await supabase
    .from('events')
    .select('checksum')
    .in('checksum', checksums);

  const existingChecksums = new Set((existing || []).map(e => e.checksum));

  // 8) 新規データのみをupsert
  let newCount = 0;
  let skippedCount = 0;

  for (const r of uniques){
    if (existingChecksums.has(r.checksum)) {
      skippedCount++;
      continue; // 既存データはスキップ
    }

    const { error } = await supabase
      .from('events')
      .upsert({
        tour: r.tour,
        tour_start_date: r.tour_start_date || null,
        tour_end_date: r.tour_end_date || null,
        place: r.place,
        place_start_date: r.place_start_date || null,
        place_end_date: r.place_end_date || null,
        date: r.date || null,
        performance: r.performance || null,
        artist: r.artist,
        source_url: r.source_url,
        checksum: r.checksum
      }, { onConflict: 'artist,tour,place,date,performance' });
    if (error) {
      log.error({ err: error, row: r }, 'upsert failed');
    } else {
      newCount++;
    }
  }

  log.info({ total: uniques.length, new: newCount, skipped: skippedCount }, 'Processing summary');

  // 9) url_sourcesのステータス更新（成功）
  await supabase
    .from('url_sources')
    .update({
      last_crawled_at: new Date().toISOString(),
      last_status: 'success'
    })
    .eq('source_url', sourceUrl);

  return newCount;
}

// DB保存なしで抽出結果だけを返す関数
async function extractOnly(sourceUrl: string, options?: { useAi?: boolean }){
  const { useAi = true } = options || {};

  // robots.txtチェック
  const allowed = await canFetch(sourceUrl);
  if (!allowed) throw new Error('robots.txt disallow');

  // レンダリング取得
  const result = await fetchRenderedHtml(sourceUrl);
  const html = result.html;
  const finalUrl = result.finalUrl;

  // 構造化/HTML/AIの順で抽出
  let cands = extractFromJsonLd(html);
  if (!cands.length) cands = await extractFromHtml(html);
  let aiTried = false;
  if (!cands.length && useAi) {
    aiTried = true;
    cands = await extractFromAi(html);
  }

  const records = fillRanges(cands.map(c => ({
    tour: (c.tour||'').trim(),
    tour_start_date: '',
    tour_end_date: '',
    place: (c.place||'').trim(),
    place_start_date: '',
    place_end_date: '',
    date: c.date ? c.date.split('T')[0] : '',
    performance: (c.performance||'').slice(0,5),
    artist: (c.artist||'').trim(),
    source_url: finalUrl
  })));

  return { records, usedAi: aiTried && records.length > 0, aiTried };
}

async function main(){
  const url = process.argv[2];
  if (!url) throw new Error('usage: pnpm --filter worker tsx src/run.ts <url>');
  const count = await runOnce(url);
  console.log(`OK: ${count} rows`);
}
if (require.main === module){ main().catch(e=>{ console.error(e); process.exit(1); }); }

export { runOnce, extractOnly };