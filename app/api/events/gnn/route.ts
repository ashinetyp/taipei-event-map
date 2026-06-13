import { NextResponse } from 'next/server';
import { scrapeGNN } from '@/lib/scrapers/gnn';

export const revalidate = 3600; // 1 小時 cache

export async function GET() {
  try {
    const events = await scrapeGNN();
    return NextResponse.json({
      events,
      total: events.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ events: [], total: 0, error: String(err) }, { status: 500 });
  }
}
