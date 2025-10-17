import { request } from 'undici';
import robotsParser from 'robots-parser';
import { chromium } from 'playwright';

const UA = process.env.USER_AGENT || 'AndFanFanBot/1.0';
const TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS || '45000');
const RESPECT = (process.env.RESPECT_ROBOTS_TXT || 'true') === 'true';
const MAX_REQUESTS_PER_HOST_PER_MIN = Number(process.env.MAX_REQUESTS_PER_HOST_PER_MIN || '6');

// ホスト単位のレート制限（簡易トークンバケット）
const hostTokens = new Map<string, { tokens: number; lastRefill: number }>();

function getHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export async function checkRateLimit(url: string): Promise<boolean> {
  const host = getHostFromUrl(url);
  if (!host) return false;

  const now = Date.now();
  const bucket = hostTokens.get(host) || { tokens: MAX_REQUESTS_PER_HOST_PER_MIN, lastRefill: now };

  // 1分経過ごとにトークンをリフィル
  const minutesPassed = (now - bucket.lastRefill) / 60000;
  if (minutesPassed >= 1) {
    bucket.tokens = MAX_REQUESTS_PER_HOST_PER_MIN;
    bucket.lastRefill = now;
  }

  // トークンがあれば消費して許可
  if (bucket.tokens > 0) {
    bucket.tokens--;
    hostTokens.set(host, bucket);
    return true;
  }

  return false;
}

export async function canFetch(url: string){
  if (!RESPECT) return true;
  try{
    const u = new URL(url);
    const robotsUrl = `${u.origin}/robots.txt`;
    const res = await request(robotsUrl, { headers: { 'User-Agent': UA } });
    const txt = await res.body.text();
    const rp = robotsParser(robotsUrl, txt);
    return rp.isAllowed(url, UA) !== false;
  }catch{ return true; }
}

export async function fetchRenderedHtml(url: string){
  const browser = await chromium.launch({ headless: (process.env.HEADLESS||'true')==='true' });
  const page = await browser.newPage({ userAgent: UA });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await page.waitForTimeout(3000);
  const html = await page.content();
  const finalUrl = page.url();
  await browser.close();
  return { html, finalUrl };
}