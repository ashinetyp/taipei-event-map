/**
 * 資料蒐集腳本 - 每天由 GitHub Actions 執行
 * 將所有來源的活動資料合併後存入 data/events-cache.json
 *
 * 執行方式：
 *   npx tsx scripts/collect.ts
 */

import fs from 'fs';
import path from 'path';
import { scrapeAccupass } from '../lib/scrapers/accupass';
import { scrapeGNN } from '../lib/scrapers/gnn';

const OUTPUT_FILE = path.join(process.cwd(), 'data', 'events-cache.json');

// ── culture.tw ──────────────────────────────────────────────────────────────

const CULTURE_API = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ';

const CULTURE_CATEGORY_MAP: Record<string, string> = {
  '1': '演出',
  '2': '演出',
  '3': '演出',
  '4': '體驗活動',
  '5': '展覽',
  '6': '展覽',
  '7': '體驗活動',
  '8': '體驗活動',
};

function getCutoff(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
}

function extractDistrict(address: string): string {
  const districts = ['中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區','北投區','內湖區','南港區','文山區'];
  for (const d of districts) {
    if (address.includes(d)) return d;
  }
  return '中正區';
}

async function fetchCultureCategory(category: string) {
  try {
    const res = await fetch(`${CULTURE_API}&category=${category}&areaCode=01&page=1`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function collectCulture() {
  console.log('📡 蒐集 culture.tw...');
  const cutoff = getCutoff();
  const categories = ['1','2','3','4','5','6','7','8'];
  const results = await Promise.all(categories.map(fetchCultureCategory));
  const all = results.flat();

  const seen = new Set<string>();
  const events = [];
  let idx = 0;

  for (const show of all) {
    const key = `${show.title}|${show.startDate}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const endDate = (show.endDate || show.startDate).replace(/\//g, '-');
    const startDate = (show.startDate || '').replace(/\//g, '-');
    if (endDate < cutoff) continue;

    const info = show.showInfo?.[0];
    const lat = parseFloat(info?.latitude || show.latitude || '');
    const lng = parseFloat(info?.longitude || show.longitude || '');
    const address = info?.location || show.location || '';

    const isTaipei = address.includes('台北') || address.includes('臺北') ||
      (lat >= 24.96 && lat <= 25.21 && lng >= 121.44 && lng <= 121.67);
    if (!isTaipei) continue;
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;

    events.push({
      id: `culture-${idx++}`,
      title: show.title,
      category: CULTURE_CATEGORY_MAP[show.category] || '展覽',
      district: extractDistrict(address),
      location: info?.locationName || show.locationName || '',
      address,
      lat, lng,
      startDate,
      endDate,
      description: (show.descriptionFilterHtml || '').replace(/<[^>]+>/g, '').slice(0, 200),
      fee: ((info?.price || show.price || '').includes('免費') ? '免費' : '付費') as '免費' | '付費',
      url: show.showURL || '',
      source: 'culture.tw',
    });
  }

  console.log(`  → ${events.length} 筆`);
  return events;
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🗓  開始蒐集 ${new Date().toLocaleString('zh-TW')}\n`);

  // 依序蒐集（避免 rate limit）
  const cultureEvents = await collectCulture();

  console.log('📡 蒐集 GNN 巴哈姆特...');
  const gnnEvents = await scrapeGNN();
  console.log(`  → ${gnnEvents.length} 筆`);

  console.log('📡 蒐集 Accupass...');
  const accupassEvents = await scrapeAccupass();
  console.log(`  → ${accupassEvents.length} 筆`);

  // 合併去重
  const seen = new Set<string>();
  const all = [];
  for (const e of [...cultureEvents, ...gnnEvents, ...accupassEvents]) {
    const key = `${e.title}|${e.startDate}`;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(e);
    }
  }

  const output = {
    events: all,
    total: all.length,
    sources: {
      culture: cultureEvents.length,
      gnn: gnnEvents.length,
      accupass: accupassEvents.length,
    },
    collectedAt: new Date().toISOString(),
  };

  // 確保 data/ 資料夾存在
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ 完成！共 ${all.length} 筆活動`);
  console.log(`   culture.tw: ${cultureEvents.length}`);
  console.log(`   GNN:        ${gnnEvents.length}`);
  console.log(`   Accupass:   ${accupassEvents.length}`);
  console.log(`   輸出至: ${OUTPUT_FILE}\n`);
}

main().catch(err => {
  console.error('❌ 蒐集失敗:', err);
  process.exit(1);
});
