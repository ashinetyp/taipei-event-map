import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 從 data/events-cache.json 讀取（由 GitHub Actions 每日更新）
// 開發時若 cache 不存在則回傳空陣列（需先執行 npx tsx scripts/collect.ts）
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cachePath = path.join(process.cwd(), 'data', 'events-cache.json');
    if (!fs.existsSync(cachePath)) {
      return NextResponse.json({
        events: [],
        total: 0,
        message: '尚未蒐集資料，請執行 npx tsx scripts/collect.ts',
        collectedAt: null,
      });
    }
    const raw = fs.readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(raw);
    return NextResponse.json(cache);
  } catch (err) {
    return NextResponse.json({ events: [], total: 0, error: String(err) }, { status: 500 });
  }
}
