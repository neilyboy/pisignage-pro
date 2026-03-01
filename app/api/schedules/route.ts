import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function parse(row: Record<string, unknown>) {
  return { ...row, active: Boolean(row.active), days: JSON.parse(row.days as string || '[]') };
}

export async function GET() {
  const rows = db.prepare('SELECT * FROM schedules ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(parse));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, device_id, playlist_id, start_time, end_time, days, recurrence, active, priority } = body;
  const id = generateId();
  db.prepare(`
    INSERT INTO schedules (id, name, device_id, playlist_id, start_time, end_time, days, recurrence, active, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, device_id ?? null, playlist_id, start_time, end_time,
    JSON.stringify(days ?? [0,1,2,3,4,5,6]), recurrence ?? 'weekly', active ? 1 : 0, priority ?? 0);
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json(parse(row), { status: 201 });
}
