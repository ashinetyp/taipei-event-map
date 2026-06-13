'use client';

import { Event, CATEGORY_COLORS } from '@/data/events';

interface Props {
  event: Event;
  onClick?: () => void;
}

export default function EventCard({ event, onClick }: Props) {
  const color = CATEGORY_COLORS[event.category];
  const today = new Date().toISOString().split('T')[0];
  const isActive = event.startDate <= today && today <= event.endDate;
  const isUpcoming = event.startDate > today;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {event.category}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isActive ? 'bg-green-100 text-green-700' :
          isUpcoming ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-500'
        }`}>
          {isActive ? '進行中' : isUpcoming ? '即將開始' : '已結束'}
        </span>
      </div>
      <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1">{event.title}</h3>
      <p className="text-xs text-slate-500 mb-1">📍 {event.location}・{event.district}</p>
      <p className="text-xs text-slate-500 mb-2">
        🗓 {event.startDate} → {event.endDate}
      </p>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          event.fee === '免費' ? 'bg-emerald-50 text-emerald-600' :
          event.fee === '需預約' ? 'bg-amber-50 text-amber-600' :
          'bg-rose-50 text-rose-600'
        }`}>
          {event.fee}
        </span>
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-indigo-600 hover:underline"
          >
            官網 →
          </a>
        )}
      </div>
    </div>
  );
}
