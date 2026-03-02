import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { pushToDevice, pushToAll } from '@/lib/sse';

export const dynamic = 'force-dynamic';

function parse(row: Record<string, unknown>) {
  return { ...row, active: Boolean(row.active), device_ids: JSON.parse(row.device_ids as string || '[]') };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { text, color, bg_color, speed, device_ids, active, expires_at, start_at } = body;
  db.prepare(`
    UPDATE announcements SET
      text = COALESCE(?, text), color = COALESCE(?, color), bg_color = COALESCE(?, bg_color),
      speed = COALESCE(?, speed), device_ids = COALESCE(?, device_ids),
      active = COALESCE(?, active), expires_at = COALESCE(?, expires_at),
      start_at = ?
    WHERE id = ?
  `).run(text ?? null, color ?? null, bg_color ?? null, speed ?? null,
    device_ids ? JSON.stringify(device_ids) : null,
    active !== undefined ? (active ? 1 : 0) : null,
    expires_at !== undefined ? (expires_at ?? null) : undefined,
    start_at !== undefined ? (start_at ?? null) : null,
    params.id);
  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(params.id) as Record<string, unknown>;
  const parsed = parse(row) as Record<string, unknown> & { active: boolean; device_ids: string[] };
  // Re-push to devices if this is a full edit (text present) and active with no future start_at
  const now = Math.floor(Date.now() / 1000);
  if (text && parsed.active && (!parsed.start_at || (parsed.start_at as number) <= now)) {
    const evt = { type: 'announcement', text: parsed.text as string, color: parsed.color as string, bg_color: parsed.bg_color as string, speed: (parsed.speed as number) ?? 50 };
    if (!parsed.device_ids.length) pushToAll(evt);
    else for (const deviceId of parsed.device_ids) pushToDevice(deviceId, evt);
  }
  return NextResponse.json(parsed);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
