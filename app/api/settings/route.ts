import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { pushToAll } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = (db as import('better-sqlite3').Database)
    .prepare('SELECT key, value FROM settings')
    .all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  rows.forEach(r => { result[r.key] = r.value; });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, string>;
  const upsert = (db as import('better-sqlite3').Database)
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const upsertMany = (db as import('better-sqlite3').Database).transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) upsert.run(key, value);
  });
  upsertMany(Object.entries(body));
  pushToAll({ type: 'settings' });
  return NextResponse.json({ success: true });
}
