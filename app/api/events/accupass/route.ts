import { NextResponse } from 'next/server';
import { scrapeAccupass } from '@/lib/scrapers/accupass';

// Accupass 爬蟲獨立 endpoint，cache 2小時
export const revalidate = 7200;

export async function GET() {
  try {
    const events = await scrapeAccupass();
    return NextResponse.json({
      events,
      total: events.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ events: [], total: 0, error: String(err) }, { status: 500 });
  }
}
