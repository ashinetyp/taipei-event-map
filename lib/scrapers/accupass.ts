// Accupass 爬蟲 - 搜尋台北活動並解析資料

const BASE_URL = 'https://www.accupass.com';

// 搜尋關鍵字，每個各取 PER_KEYWORD 筆
const KEYWORDS = [
  '展覽', '市集', '快閃', '體驗', '美食節', '音樂', '演唱會', '表演',
  '動漫', '動畫', '漫畫', '電玩', '同人', 'cosplay', '遊戲',
  '節慶', '親子', '工作坊',
];
const PER_KEYWORD = 20; // 每個關鍵字取多少筆（搜尋頁最多 37 筆）

const CATEGORY_MAP: Record<string, string> = {
  展覽: '展覽',
  市集: '市集',
  快閃: '快閃店',
  音樂: '演出',
  演唱會: '演出',
  表演: '演出',
  體驗: '體驗活動',
  親子: '體驗活動',
  工作坊: '體驗活動',
  美食: '美食活動',
  節慶: '節慶',
  動漫: '動漫電玩',
  動畫: '動漫電玩',
  漫畫: '動漫電玩',
  電玩: '動漫電玩',
  遊戲: '動漫電玩',
  同人: '動漫電玩',
  cosplay: '動漫電玩',
};

const ANIME_KEYS = [
  '動漫', '電玩', '遊戲', '同人', 'cosplay', 'Cosplay', 'ACG', 'acg',
  '漫畫', '動畫', 'anime', 'Anime', 'manga', 'Manga', 'gaming', 'game',
];

const DISTRICT_KEYWORDS: Record<string, string> = {
  中正: '中正區', 大同: '大同區', 中山: '中山區', 松山: '松山區',
  大安: '大安區', 萬華: '萬華區', 信義: '信義區', 士林: '士林區',
  北投: '北投區', 內湖: '內湖區', 南港: '南港區', 文山: '文山區',
  西門: '萬華區', 東區: '大安區', 忠孝: '大安區',
  南京: '中山區', 敦化: '大安區', 復興: '中山區',
  松菸: '信義區', 華山: '中正區', 故宮: '士林區', 大稻埕: '大同區',
};

const DISTRICT_CENTERS: Record<string, { lat: number; lng: number }> = {
  中正區: { lat: 25.0324, lng: 121.5198 },
  大同區: { lat: 25.0634, lng: 121.5133 },
  中山區: { lat: 25.0634, lng: 121.5326 },
  松山區: { lat: 25.0504, lng: 121.5773 },
  大安區: { lat: 25.0264, lng: 121.5437 },
  萬華區: { lat: 25.0344, lng: 121.4997 },
  信義區: { lat: 25.0335, lng: 121.5678 },
  士林區: { lat: 25.0937, lng: 121.5258 },
  北投區: { lat: 25.1317, lng: 121.5013 },
  內湖區: { lat: 25.0797, lng: 121.5868 },
  南港區: { lat: 25.0553, lng: 121.6073 },
  文山區: { lat: 24.9975, lng: 121.5676 },
};

interface SearchEvent {
  id: string;
  name: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  keyword: string;
}

interface AccupassEvent {
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

function guessDistrict(text: string): string {
  for (const [key, district] of Object.entries(DISTRICT_KEYWORDS)) {
    if (text.includes(key)) return district;
  }
  return '中正區';
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, 台北市, 台灣`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=tw`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TaipeiEventMap/1.0' } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

// 搜尋頁面已含 name/startDateTime/endDateTime/location，直接解析
async function searchKeyword(keyword: string): Promise<SearchEvent[]> {
  try {
    const url = `${BASE_URL}/search?city=taipei&q=${encodeURIComponent(keyword)}&sort=start_time&order=asc`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'zh-TW', 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await res.text();

    const results: SearchEvent[] = [];
    const idSet = new Set<string>();

    // 解析搜尋頁內嵌的 JSON 資料（含 name/startDateTime/endDateTime）
    const pattern = /eventIdNumber\\":\\"(\d{15,25})\\",\\"photoUrl\\":\\"[^"]*\\",\\"name\\":\\"([^"]+)\\",\\"startDateTime\\":\\"([^"]+)\\",\\"endDateTime\\":\\"([^"]+)\\"[^}]*\\"location\\":\\"([^"]*)\\"/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const [, id, name, startDateTime, endDateTime, location] = match;
      if (!idSet.has(id)) {
        idSet.add(id);
        results.push({ id, name, startDateTime, endDateTime, location, keyword });
      }
    }

    // fallback：只取 ID（若上面 regex 沒抓到）
    if (results.length === 0) {
      const idPattern = /eventIdNumber\\":\\"(\d{15,25})\\"/g;
      while ((match = idPattern.exec(html)) !== null) {
        const id = match[1];
        if (!idSet.has(id)) {
          idSet.add(id);
          results.push({ id, name: '', startDateTime: '', endDateTime: '', location: '', keyword });
        }
      }
    }

    return results.slice(0, PER_KEYWORD);
  } catch {
    return [];
  }
}

// 只在搜尋頁資料不完整時才爬個別頁面取地址
async function fetchAddress(id: string): Promise<{ address: string; fee: string; description: string } | null> {
  try {
    const url = `${BASE_URL}/event/${id}`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'zh-TW', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ldMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (!ldMatch) return null;
    const ld = JSON.parse(ldMatch[1]);
    const address = ld.location?.address?.streetAddress || ld.location?.address || '';
    const fee = ld.offers?.price === 0 || ld.offers?.price === '0' ? '免費' : '付費';
    const description = (ld.description || '').replace(/<[^>]+>/g, '').slice(0, 200);
    return { address, fee, description };
  } catch {
    return null;
  }
}

function parseISODate(dt: string): string {
  return dt ? dt.split('T')[0] : '';
}

function guessCategory(text: string, keyword: string): string {
  const all = text + keyword;
  if (ANIME_KEYS.some(k => all.includes(k))) return '動漫電玩';
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (all.includes(key)) return cat;
  }
  return '體驗活動';
}

export async function scrapeAccupass(): Promise<AccupassEvent[]> {
  const globalSeen = new Set<string>();
  const allEvents: AccupassEvent[] = [];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);
  const oldCutoff = new Date();
  oldCutoff.setFullYear(oldCutoff.getFullYear() - 2);

  for (const kw of KEYWORDS) {
    const results = await searchKeyword(kw);
    const newItems = results.filter(r => !globalSeen.has(r.id));
    newItems.forEach(r => globalSeen.add(r.id));

    // 每批 5 筆並發
    for (let i = 0; i < newItems.length; i += 5) {
      const batch = newItems.slice(i, i + 5);

      const processed = await Promise.all(batch.map(async (item) => {
        const startDate = parseISODate(item.startDateTime);
        const endDate = parseISODate(item.endDateTime) || startDate;

        if (!startDate) return null;
        if (endDate && new Date(endDate) < cutoff) return null;
        if (startDate && new Date(startDate) < oldCutoff) return null;

        // 若搜尋頁沒有詳細地址，爬個別頁面
        let address = '';
        let fee = '付費';
        let description = '';

        const detail = await fetchAddress(item.id);
        if (detail) {
          address = detail.address;
          fee = detail.fee;
          description = detail.description;
        }

        // 只要台北市活動
        const isTaipei = item.location?.includes('Taipei') || item.location?.includes('台北') ||
          address.includes('台北') || address.includes('臺北');
        if (!isTaipei && address) return null;

        const district = guessDistrict(address || item.name);
        let coords = DISTRICT_CENTERS[district] || DISTRICT_CENTERS['中正區'];

        if (address && address.length > 5) {
          const geocoded = await geocode(address);
          if (geocoded) coords = geocoded;
        }

        return {
          id: `accu-${item.id}`,
          title: item.name || '',
          category: guessCategory(item.name, kw),
          startDate,
          endDate,
          location: address.split(',')[0] || address.slice(0, 20) || item.location || '',
          address,
          district,
          lat: coords.lat,
          lng: coords.lng,
          fee,
          url: `${BASE_URL}/event/${item.id}`,
          source: 'accupass',
          description,
        } as AccupassEvent;
      }));

      for (const e of processed) {
        if (e && e.title) allEvents.push(e);
      }

      if (i + 5 < newItems.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  return allEvents;
}
