'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import { Event, CATEGORY_COLORS } from '@/data/events';

interface Props {
  events: Event[];
  onSelectEvent: (e: Event) => void;
}

export default function CalendarView({ events, onSelectEvent }: Props) {
  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startDate,
    end: (() => {
      const d = new Date(e.endDate);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })(),
    backgroundColor: CATEGORY_COLORS[e.category],
    extendedProps: { event: e },
  }));

  return (
    <div className="h-full p-3 overflow-auto">
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale="zh-tw"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listMonth',
        }}
        buttonText={{ today: '今天', month: '月', list: '列表' }}
        events={calendarEvents}
        eventClick={info => {
          const e = info.event.extendedProps.event as Event;
          onSelectEvent(e);
        }}
        height="auto"
        dayMaxEvents={3}
      />
    </div>
  );
}
