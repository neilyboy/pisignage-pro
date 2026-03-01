import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function parse(row: Record<string, unknown>) {
  return { ...row, active: Boolean(row.active), device_ids: JSON.parse(row.device_ids as string || '[]') };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { text, color, bg_color, speed, device_ids, active, expires_at } = body;
  db.prepare(`
    UPDATE announcements SET
      text = COALESCE(?, text), color = COALESCE(?, color), bg_color = COALESCE(?, bg_color),
      speed = COALESCE(?, speed), device_ids = COALESCE(?, device_ids),
      active = COALESCE(?, active), expires_at = COALESCE(?, expires_at)
    WHERE id = ?
  `).run(text ?? null, color ?? null, bg_color ?? null, speed ?? null,
    device_ids ? JSON.stringify(device_ids) : null,
    active !== undefined ? (active ? 1 : 0) : null, expires_at ?? null, params.id);
  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json(parse(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
