import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';
import { pushToDevice, pushToAll } from '@/lib/sse';

export const dynamic = 'force-dynamic';

function parse(row: Record<string, unknown>) {
  return { ...row, active: Boolean(row.active), device_ids: JSON.parse(row.device_ids as string || '[]') };
}

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1';
  const rows = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all() as Record<string, unknown>[];
  if (all) return NextResponse.json(rows.map(parse));
  // For display: filter to only active, not expired, and past start_at
  const now = Math.floor(Date.now() / 1000);
  const active = rows.filter(r => {
    if (!r.active) return false;
    if (r.expires_at && (r.expires_at as number) < now) return false;
    if (r.start_at && (r.start_at as number) > now) return false;
    return true;
  });
  return NextResponse.json(active.map(parse));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, color, bg_color, speed, device_ids, active, expires_at, start_at } = body;
  const id = generateId();
  db.prepare(`
    INSERT INTO announcements (id, text, color, bg_color, speed, device_ids, active, expires_at, start_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, text, color ?? '#ffffff', bg_color ?? '#1a1a2e', speed ?? 50,
    JSON.stringify(device_ids ?? []), active ? 1 : 0, expires_at ?? null, start_at ?? null);

  // Only push immediately if active AND no future start_at
  const now = Math.floor(Date.now() / 1000);
  if (active && (!start_at || start_at <= now)) {
    const event = { type: 'announcement', text, color: color ?? '#ffffff', bg_color: bg_color ?? '#1a1a2e', speed: speed ?? 50 };
    if (!device_ids || device_ids.length === 0) {
      pushToAll(event);
    } else {
      for (const deviceId of device_ids) pushToDevice(deviceId, event);
    }
  }

  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json(parse(row), { status: 201 });
}
