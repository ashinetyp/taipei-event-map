// GNN（巴哈姆特）爬蟲 - 掃描最新文章，抓取台北動漫/遊戲快閃店、期間限定活動

const BASE = 'https://gnn.gamer.com.tw';

// 掃描最新 N 篇文章（GNN 文章以流水號 sn 排列）
const SCAN_COUNT = 300; // 最近 300 篇（約 2-3 週）
const BATCH_SIZE = 3;   // 每批 3 篇，避免 rate limit

// 已知台北地點 → 座標
const KNOWN_LOCATIONS: Record<string, { name: string; district: string; lat: number; lng: number }> = {
  三創: { name: '三創生活園區', district: '中正區', lat: 25.0448, lng: 121.5295 },
  光華: { name: '光華商場', district: '中正區', lat: 25.0445, lng: 121.5292 },
  華山: { name: '華山1914文創園區', district: '中正區', lat: 25.0447, lng: 121.5271 },
  松菸: { name: '松山文創園區', district: '信義區', lat: 25.0458, lng: 121.5608 },
  西門: { name: '西門町', district: '萬華區', lat: 25.0426, lng: 121.5085 },
  ATT: { name: 'ATT 4 FUN', district: '信義區', lat: 25.0332, lng: 121.5645 },
  '台北101': { name: '台北101', district: '信義區', lat: 25.0338, lng: 121.5646 },
  信義: { name: '信義區', district: '信義區', lat: 25.0335, lng: 121.5678 },
  大稻埕: { name: '大稻埕', district: '大同區', lat: 25.0566, lng: 121.5099 },
  南港展覽: { name: '南港展覽館', district: '南港區', lat: 25.0553, lng: 121.6073 },
  世貿: { name: '台北世界貿易中心', district: '信義區', lat: 25.0335, lng: 121.5678 },
  小巨蛋: { name: '台北小巨蛋', district: '松山區', lat: 25.0514, lng: 121.5504 },
  中山: { name: '中山區', district: '中山區', lat: 25.0634, lng: 121.5326 },
  '士林夜市': { name: '士林夜市', district: '士林區', lat: 25.0937, lng: 121.5258 },
  '內湖': { name: '內湖區', district: '內湖區', lat: 25.0797, lng: 121.5868 },
  '故宮': { name: '國立故宮博物院', district: '士林區', lat: 25.1020, lng: 121.5484 },
  '北投': { name: '北投區', district: '北投區', lat: 25.1317, lng: 121.5013 },
  '大安': { name: '大安區', district: '大安區', lat: 25.0264, lng: 121.5437 },
  '忠孝': { name: '忠孝商圈', district: '大安區', lat: 25.0414, lng: 121.5498 },
  '東區': { name: '東區', district: '大安區', lat: 25.0414, lng: 121.5498 },
  '南港': { name: '南港區', district: '南港區', lat: 25.0553, lng: 121.6073 },
  '微風': { name: '微風廣場', district: '中山區', lat: 25.0520, lng: 121.5448 },
  '誠品': { name: '誠品書店', district: '信義區', lat: 25.0335, lng: 121.5678 },
  '台大': { name: '台灣大學', district: '大安區', lat: 25.0175, lng: 121.5397 },
};

// 活動相關關鍵字（出現在標題才處理）
const EVENT_KEYWORDS = [
  '快閃店', '快閃', '期間限定', '展覽', '特展', '展示', '展出', '活動',
  '扭蛋', '公仔', '周邊', '主題咖啡', '聯名', '博覽會', '博覽', '市集',
  '嘉年華', '動漫展', '同人展', '台灣展',
];

interface GNNEvent {
  id: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  location: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  fee: string;
  url: string;
  source: string;
  description: string;
}

function parseDates(text: string, refYear = new Date().getFullYear()): { start: string; end: string } | null {
  const monthDay = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
  const matches: string[] = [];
  let m;
  while ((m = monthDay.exec(text)) !== null) {
    const month = m[1].padStart(2, '0');
    const day = m[2].padStart(2, '0');
    const candidate = `${refYear}-${month}-${day}`;
    if (!matches.includes(candidate)) matches.push(candidate);
  }
  if (matches.length === 0) return null;
  if (matches.length === 1) return { start: matches[0], end: matches[0] };
  return { start: matches[0], end: matches[matches.length - 1] };
}

function findLocation(text: string): { name: string; district: string; lat: number; lng: number } | null {
  for (const [key, loc] of Object.entries(KNOWN_LOCATIONS)) {
    if (text.includes(key)) return loc;
  }
  return null;
}

function guessCategory(text: string): string {
  if (/快閃店|快閃|pop.?up/i.test(text)) return '快閃店';
  if (/動漫|漫畫|同人|ACG|cosplay|電玩|遊戲|扭蛋|周邊|公仔/i.test(text)) return '動漫電玩';
  if (/展覽|特展|博覽/i.test(text)) return '展覽';
  if (/市集/i.test(text)) return '市集';
  if (/美食|咖啡|餐廳|聯名餐/i.test(text)) return '美食活動';
  if (/嘉年華|節慶/i.test(text)) return '節慶';
  return '動漫電玩';
}

// 取得 GNN 最新文章 SN
async function getLatestSN(): Promise<number> {
  try {
    const res = await fetch(`${BASE}/index.php`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const matches = html.match(/detail\.php\?sn=(\d+)/g) || [];
    const sns = matches.map(s => parseInt(s.replace('detail.php?sn=', '')));
    return Math.max(...sns);
  } catch {
    return 306600; // fallback
  }
}

async function fetchArticle(sn: number, retries = 2): Promise<GNNEvent | null> {
  try {
    const url = `${BASE}/detail.php?sn=${sn}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-TW' },
    });
    if (res.status === 429) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 3000));
        return fetchArticle(sn, retries - 1);
      }
      return null;
    }
    if (!res.ok) return null;
    const html = await res.text();

    // 取 JSON-LD
    const ldMatch = html.match(/application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldMatch) return null;
    let ldList;
    try { ldList = JSON.parse(ldMatch[1]); } catch { return null; }
    const article = Array.isArray(ldList)
      ? ldList.find((x: { '@type': string }) => x['@type'] === 'NewsArticle')
      : null;
    if (!article) return null;

    const title: string = article.headline || '';
    const description: string = (article.description || '')
      .replace(/&times;/g, '×').replace(/&[a-z]+;/g, '').replace(/<[^>]+>/g, '');

    // 標題必須含活動關鍵字
    if (!EVENT_KEYWORDS.some(k => title.includes(k))) return null;

    // 必須有台北地點
    const fullText = title + description;
    const loc = findLocation(fullText);
    if (!loc) return null;

    // 解析日期
    const refYear = new Date().getFullYear();
    const dates = parseDates(fullText, refYear);
    if (!dates) return null;

    // 過濾已結束超過一個月
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);
    if (new Date(dates.end) < cutoff) return null;

    return {
      id: `gnn-${sn}`,
      title,
      category: guessCategory(fullText),
      startDate: dates.start,
      endDate: dates.end,
      location: loc.name,
      address: `台北市${loc.district}`,
      district: loc.district,
      lat: loc.lat,
      lng: loc.lng,
      fee: '免費',
      url,
      source: 'gnn',
      description: description.slice(0, 200),
    };
  } catch {
    return null;
  }
}

export async function scrapeGNN(): Promise<GNNEvent[]> {
  const latestSN = await getLatestSN();
  const startSN = latestSN - SCAN_COUNT;
  const allEvents: GNNEvent[] = [];

  // 從新到舊批次掃描
  for (let sn = latestSN; sn >= startSN; sn -= BATCH_SIZE) {
    const batch = Array.from({ length: BATCH_SIZE }, (_, i) => sn - i).filter(s => s > 0);
    const results = await Promise.all(batch.map(s => fetchArticle(s)));
    for (const e of results) {
      if (e) allEvents.push(e);
    }
    await new Promise(r => setTimeout(r, 900)); // 每批等 900ms 避免 rate limit
  }

  return allEvents;
}
