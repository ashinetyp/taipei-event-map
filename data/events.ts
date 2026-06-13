export type EventCategory = '展覽' | '市集' | '快閃店' | '演出' | '體驗活動' | '美食活動' | '節慶' | '動漫電玩';

export type District =
  | '中正區' | '大同區' | '中山區' | '松山區' | '大安區'
  | '萬華區' | '信義區' | '士林區' | '北投區' | '內湖區'
  | '南港區' | '文山區';

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  district: District;
  location: string;
  address: string;
  lat: number;
  lng: number;
  startDate: string;
  endDate: string;
  description: string;
  highlights?: string[];
  openHours?: string;
  ticketInfo?: string;
  organizer?: string;
  fee: '免費' | '付費' | '需預約';
  url?: string;
  sourceLabel?: string;
  source?: string;
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  展覽: '#6366f1',
  市集: '#f59e0b',
  快閃店: '#ec4899',
  演出: '#14b8a6',
  體驗活動: '#8b5cf6',
  美食活動: '#f97316',
  節慶: '#ef4444',
  動漫電玩: '#0ea5e9',
};

// 靜態資料已清空，所有活動均來自 API（文化部、Accupass）
// 如需手動新增真實活動，請在此加入並填寫正確的 source / sourceLabel
export const events: Event[] = [];
