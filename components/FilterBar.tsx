'use client';

import { EventCategory, District, CATEGORY_COLORS } from '@/data/events';

const ALL_CATEGORIES: EventCategory[] = ['展覽', '演出', '體驗活動', '動漫電玩', '市集', '快閃店', '美食活動', '節慶'];
const DISTRICTS: District[] = [
  '中正區', '大同區', '中山區', '松山區', '大安區',
  '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'
];
const FEES = ['免費', '付費', '需預約'] as const;

interface Props {
  selectedCategories: EventCategory[];
  selectedDistrict: District | '';
  selectedFee: string;
  keyword: string;
  categoryCounts: Partial<Record<EventCategory, number>>;
  onCategoryToggle: (c: EventCategory) => void;
  onDistrictChange: (d: District | '') => void;
  onFeeChange: (f: string) => void;
  onKeywordChange: (k: string) => void;
}

export default function FilterBar({
  selectedCategories, selectedDistrict, selectedFee, keyword, categoryCounts,
  onCategoryToggle, onDistrictChange, onFeeChange, onKeywordChange,
}: Props) {
  // 只顯示有資料的分類
  const activeCategories = ALL_CATEGORIES.filter(cat => (categoryCounts[cat] ?? 0) > 0);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap gap-3 items-center shadow-sm">
      {/* Search */}
      <input
        type="text"
        placeholder="搜尋活動名稱..."
        value={keyword}
        onChange={e => onKeywordChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {/* Categories - 只顯示有資料的 */}
      <div className="flex flex-wrap gap-1.5">
        {activeCategories.map(cat => {
          const active = selectedCategories.includes(cat);
          const color = CATEGORY_COLORS[cat];
          const count = categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => onCategoryToggle(cat)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1"
              style={{
                backgroundColor: active ? color : 'transparent',
                borderColor: color,
                color: active ? '#fff' : color,
              }}
            >
              {cat}
              <span
                className="text-[10px] rounded-full px-1 leading-tight"
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : `${color}22`,
                  color: active ? '#fff' : color,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* District */}
      <select
        value={selectedDistrict}
        onChange={e => onDistrictChange(e.target.value as District | '')}
        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">全部行政區</option>
        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* Fee */}
      <select
        value={selectedFee}
        onChange={e => onFeeChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">全部費用</option>
        {FEES.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
    </div>
  );
}
