'use client';

import { useEffect, useRef } from 'react';
import { Event, CATEGORY_COLORS } from '@/data/events';

interface Props {
  events: Event[];
  selectedEvent: Event | null;
  onSelectEvent: (e: Event) => void;
}

export default function MapView({ events, selectedEvent, onSelectEvent }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<import('leaflet').CircleMarker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      const map = L.map(mapRef.current!, {
        center: [25.05, 121.54],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    };

    initMap();
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L_import = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current!;

      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      events.forEach(event => {
        const color = CATEGORY_COLORS[event.category];
        const isSelected = selectedEvent?.id === event.id;

        const marker = L.circleMarker([event.lat, event.lng], {
          radius: isSelected ? 14 : 10,
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        });

        marker.bindTooltip(
          `<div style="font-size:12px;font-weight:600">${event.title}</div>
           <div style="font-size:11px;color:#666">${event.category} · ${event.district}</div>`,
          { direction: 'top', offset: [0, -10] }
        );

        marker.on('click', () => onSelectEvent(event));
        marker.addTo(map);
        markersRef.current.push(marker);
      });
    };
    L_import();
  }, [events, selectedEvent, onSelectEvent]);

  useEffect(() => {
    if (selectedEvent && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedEvent.lat, selectedEvent.lng], 15, { duration: 1 });
    }
  }, [selectedEvent]);

  return (
    <div ref={mapRef} className="w-full h-full" />
  );
}
