'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useEffect } from 'react';
import { events as staticEvents, Event, EventCategory, District } from '@/data/events';
import FilterBar from '@/components/FilterBar';
import EventCard from '@/components/EventCard';
import EventDetail from '@/components/EventDetail';
import CalendarView from '@/components/CalendarView';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type ViewMode = 'map' | 'calendar' | 'list';

export default function Home() {
  const [view, setView] = useState<ViewMode>('map');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | ''>('');
  const [selectedFee, setSelectedFee] = useState('');
  const [keyword, setKeyword] = useState('');
  const [apiEvents, setApiEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectedAt, setCollectedAt] = useState<string | null>(null);

  // 從 cache 一次載入所有資料（由 GitHub Actions 每日更新）
  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        if (data.events) setApiEvents(data.events);
        if (data.collectedAt) setCollectedAt(data.collectedAt);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const events = useMemo(() => {
    const seen = new Set(staticEvents.map(e => `${e.title}|${e.startDate}`));
    const unique = [...staticEvents];
    for (const e of apiEvents) {
      const key = `${e.title}|${e.startDate}`;
      if (!seen.has(key)) { seen.add(key); unique.push(e); }
    }
    return unique;
  }, [apiEvents]);

  const toggleCategory = (cat: EventCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // 統計每個分類的活動數量（用於 FilterBar badge）
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<EventCategory, number>> = {};
    for (const e of events) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(e.category)) return false;
      if (selectedDistrict && e.district !== selectedDistrict) return false;
      if (selectedFee && e.fee !== selectedFee) return false;
      if (keyword && !e.title.includes(keyword) && !e.location.includes(keyword)) return false;
      return true;
    });
  }, [events, selectedCategories, selectedDistrict, selectedFee, keyword]);

  const tabs: { key: ViewMode; label: string; icon: string }[] = [
    { key: 'map', label: '地圖', icon: '🗺️' },
    { key: 'calendar', label: '日曆', icon: '📅' },
    { key: 'list', label: '列表', icon: '📋' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏙️</span>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">台北活動地圖</h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
            期間限定・展覽・市集・快閃
            {loading && <span className="text-indigo-400 animate-pulse">● 載入中...</span>}
            {!loading && collectedAt && (
              <span className="text-slate-400">
                更新於 {new Date(collectedAt).toLocaleDateString('zh-TW')}
              </span>
            )}
          </p>
          </div>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                view === tab.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Filter */}
      <FilterBar
        selectedCategories={selectedCategories}
        selectedDistrict={selectedDistrict}
        selectedFee={selectedFee}
        keyword={keyword}
        categoryCounts={categoryCounts}
        onCategoryToggle={toggleCategory}
        onDistrictChange={setSelectedDistrict}
        onFeeChange={setSelectedFee}
        onKeywordChange={setKeyword}
      />

      {/* Count */}
      <div className="px-4 py-1.5 text-xs text-slate-500 bg-white border-b border-slate-100">
        找到 <span className="font-semibold text-slate-700">{filtered.length}</span> 個活動
        {filtered.length !== events.length && (
          <button
            onClick={() => {
              setSelectedCategories([]);
              setSelectedDistrict('');
              setSelectedFee('');
              setKeyword('');
            }}
            className="ml-2 text-indigo-500 hover:underline"
          >
            清除篩選
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {view === 'map' && (
          <>
            <div className="flex-1 p-3 overflow-hidden">
              <MapView
                events={filtered}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
              />
            </div>
            <div className="w-80 border-l border-slate-200 bg-white overflow-hidden flex flex-col">
              <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
          </>
        )}

        {view === 'calendar' && (
          <div className="flex-1 overflow-auto">
            <CalendarView events={filtered} onSelectEvent={e => {
              setSelectedEvent(e);
              setView('map');
            }} />
          </div>
        )}

        {view === 'list' && (
          <div className="flex-1 overflow-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
            {filtered.map(e => (
              <EventCard
                key={e.id}
                event={e}
                onClick={() => {
                  setSelectedEvent(e);
                  setView('map');
                }}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-400">
                <p className="text-3xl mb-2">🔍</p>
                <p>沒有符合條件的活動</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
