import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function parse(row: Record<string, unknown>) {
  return { ...row, active: Boolean(row.active), days: JSON.parse(row.days as string || '[]') };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, device_id, playlist_id, start_time, end_time, days, recurrence, active, priority } = body;
  db.prepare(`
    UPDATE schedules SET
      name = COALESCE(?, name), device_id = COALESCE(?, device_id), playlist_id = COALESCE(?, playlist_id),
      start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time),
      days = COALESCE(?, days), recurrence = COALESCE(?, recurrence),
      active = COALESCE(?, active), priority = COALESCE(?, priority)
    WHERE id = ?
  `).run(name ?? null, device_id ?? null, playlist_id ?? null, start_time ?? null, end_time ?? null,
    days ? JSON.stringify(days) : null, recurrence ?? null,
    active !== undefined ? (active ? 1 : 0) : null, priority ?? null, params.id);
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json(parse(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM schedules WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
