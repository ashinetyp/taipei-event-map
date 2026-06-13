// 台北市政府文化局活動 API
// 來源: https://www.culture.gov.taipei 提供的 JSON API

const BASE = 'https://www.culture.gov.taipei';

interface CultureTaipeiEvent {
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
  description: string;
  source: string;
}

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

function extractDistrict(address: string): string {
  const districts = Object.keys(DISTRICT_CENTERS);
  for (const d of districts) {
    if (address.includes(d.replace('區', ''))) return d;
  }
  return '中正區';
}

function getCutoff(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
}

// 嘗試台北市文化局 API
async function fetchCultureTaipei(): Promise<CultureTaipeiEvent[]> {
  const cutoff = getCutoff();
  const events: CultureTaipeiEvent[] = [];

  try {
    // 台北市文化局活動資訊 API
    const url = `${BASE}/frontsite/cms/artsevent/list?categoryId=ALL&areaId=01&page=1&pageSize=50&lang=1`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.list || data?.data || [];

    for (const item of items) {
      const endDate = (item.endDate || item.end_date || '').replace(/\//g, '-');
      if (!endDate || endDate < cutoff) continue;

      const address = item.address || item.showAddress || '';
      const district = extractDistrict(address);
      const lat = parseFloat(item.latitude || item.lat || '0');
      const lng = parseFloat(item.longitude || item.lng || '0');
      const coords = (lat && lng) ? { lat, lng } : DISTRICT_CENTERS[district];

      events.push({
        id: `culture-taipei-${item.id || item.uid}`,
        title: item.title || item.name || '',
        category: mapCategory(item.categoryName || item.category || ''),
        startDate: (item.startDate || item.start_date || '').replace(/\//g, '-'),
        endDate,
        location: item.locationName || item.showName || '',
        address,
        district,
        lat: coords.lat,
        lng: coords.lng,
        fee: (item.price || item.fee || '').includes('免費') ? '免費' : '付費',
        url: item.url || item.webUrl || '',
        description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 200),
        source: 'culture.taipei',
      });
    }
  } catch {}

  return events;
}

function mapCategory(raw: string): string {
  if (raw.includes('展覽') || raw.includes('展示')) return '展覽';
  if (raw.includes('市集')) return '市集';
  if (raw.includes('音樂') || raw.includes('演出') || raw.includes('表演')) return '演出';
  if (raw.includes('體驗') || raw.includes('工作坊') || raw.includes('課程')) return '體驗活動';
  if (raw.includes('美食') || raw.includes('餐飲')) return '美食活動';
  if (raw.includes('節慶') || raw.includes('節日')) return '節慶';
  return '展覽';
}

export { fetchCultureTaipei };
