'use client';

import { Event, CATEGORY_COLORS } from '@/data/events';

interface Props {
  event: Event | null;
  onClose: () => void;
}

const SOURCE_ICONS: Record<string, string> = {
  'culture.tw': '🏛️',
  'accupass': '🎟️',
  'gnn': '🎮',
  'manual': '✍️',
};

function getStatus(startDate: string, endDate: string) {
  const today = new Date().toISOString().split('T')[0];
  if (today < startDate) return { label: '即將開始', cls: 'bg-blue-100 text-blue-700' };
  if (today <= endDate) return { label: '● 進行中', cls: 'bg-green-100 text-green-700' };
  return { label: '已結束', cls: 'bg-slate-100 text-slate-500' };
}

function daysLeft(endDate: string): number {
  const diff = new Date(endDate).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

export default function EventDetail({ event, onClose }: Props) {
  if (!event) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-8">
      <span className="text-5xl">🗺️</span>
      <p className="text-sm text-center leading-relaxed">
        點擊地圖或日曆上的活動<br />查看完整詳情
      </p>
    </div>
  );

  const color = CATEGORY_COLORS[event.category as keyof typeof CATEGORY_COLORS] ?? '#6366f1';
  const status = getStatus(event.startDate, event.endDate);
  const remaining = daysLeft(event.endDate);
  const sourceIcon = SOURCE_ICONS[event.source ?? 'manual'] ?? '📌';

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* 頂部色塊 */}
      <div className="p-4 pb-3" style={{ background: `linear-gradient(135deg, ${color}18 0%, ${color}06 100%)`, borderBottom: `3px solid ${color}` }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
              {event.category}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.cls}`}>
              {status.label}
            </span>
            {remaining > 0 && remaining <= 7 && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 font-medium">
                剩 {remaining} 天
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none ml-2 shrink-0">✕</button>
        </div>
        <h2 className="text-base font-bold text-slate-800 leading-snug">{event.title}</h2>
      </div>

      <div className="flex flex-col gap-0 flex-1">
        {/* 基本資訊 */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-2.5">
          <InfoRow icon="📍">
            <div>
              <div className="font-semibold text-slate-700 text-sm">{event.location}</div>
              {event.address && <div className="text-xs text-slate-500 mt-0.5">{event.address}</div>}
              <div className="text-xs text-slate-400 mt-0.5">{event.district}</div>
            </div>
          </InfoRow>

          <InfoRow icon="🗓️">
            <div className="text-sm text-slate-700">
              {event.startDate} ～ {event.endDate}
              {remaining > 0 && <span className="ml-2 text-xs text-slate-400">（還有 {remaining} 天）</span>}
              {remaining <= 0 && <span className="ml-2 text-xs text-slate-400">（已結束）</span>}
            </div>
          </InfoRow>

          {event.openHours && (
            <InfoRow icon="🕐">
              <span className="text-sm text-slate-700">{event.openHours}</span>
            </InfoRow>
          )}

          <InfoRow icon="💰">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${
                event.fee === '免費' ? 'text-emerald-600' :
                event.fee === '需預約' ? 'text-amber-600' : 'text-rose-600'
              }`}>{event.fee}</span>
              {event.ticketInfo && (
                <span className="text-xs text-slate-500">{event.ticketInfo}</span>
              )}
            </div>
          </InfoRow>

          {event.organizer && (
            <InfoRow icon="🏢">
              <span className="text-xs text-slate-500">{event.organizer}</span>
            </InfoRow>
          )}
        </div>

        {/* 活動介紹 */}
        {event.description && (
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">活動介紹</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* 活動亮點 */}
        {event.highlights && event.highlights.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">活動亮點</h3>
            <ul className="flex flex-col gap-1.5">
              {event.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 shrink-0" style={{ color }}>▸</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 來源 + 按鈕 */}
        <div className="px-4 py-3 mt-auto flex flex-col gap-2">
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2.5 px-4 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
            >
              前往官網 →
            </a>
          )}

          {/* 來源標籤 */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{sourceIcon} {event.sourceLabel ?? (
              event.source === 'culture.tw' ? '文化部藝文活動資訊系統' :
              event.source === 'accupass' ? 'Accupass 活動通' :
              event.source === 'gnn' ? '巴哈姆特 GNN' :
              '手動整理'
            )}</span>
            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                查看原始頁面
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
