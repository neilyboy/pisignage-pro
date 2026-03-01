import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(params.id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, location, notes, brightness, orientation, status, current_playlist_id } = body;

  db.prepare(`
    UPDATE devices SET
      name = COALESCE(?, name),
      location = COALESCE(?, location),
      notes = COALESCE(?, notes),
      brightness = COALESCE(?, brightness),
      orientation = COALESCE(?, orientation),
      status = COALESCE(?, status),
      current_playlist_id = COALESCE(?, current_playlist_id)
    WHERE id = ?
  `).run(name ?? null, location ?? null, notes ?? null, brightness ?? null,
    orientation ?? null, status ?? null, current_playlist_id ?? null, params.id);

  const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(params.id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM devices WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
