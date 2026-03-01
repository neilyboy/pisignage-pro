import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';
import { pushToDevice, pushToAll } from '@/lib/sse';

export const dynamic = 'force-dynamic';

function parse(row: Record<string, unknown>) {
  return { ...row, active: Boolean(row.active), device_ids: JSON.parse(row.device_ids as string || '[]') };
}

export async function GET() {
  const rows = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(parse));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, color, bg_color, speed, device_ids, active, expires_at } = body;
  const id = generateId();
  db.prepare(`
    INSERT INTO announcements (id, text, color, bg_color, speed, device_ids, active, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, text, color ?? '#ffffff', bg_color ?? '#1a1a2e', speed ?? 50,
    JSON.stringify(device_ids ?? []), active ? 1 : 0, expires_at ?? null);

  if (active) {
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
