import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { job_name, client, location, stage, hours, notes, color, position } = body;
  db.prepare(`
    UPDATE job_pipeline SET
      job_name = COALESCE(?, job_name),
      client = COALESCE(?, client),
      location = COALESCE(?, location),
      stage = COALESCE(?, stage),
      hours = COALESCE(?, hours),
      notes = COALESCE(?, notes),
      color = COALESCE(?, color),
      position = COALESCE(?, position),
      updated_at = unixepoch()
    WHERE id = ?
  `).run(
    job_name ?? null, client ?? null, location ?? null, stage ?? null,
    hours ?? null, notes ?? null, color ?? null, position ?? null,
    params.id,
  );
  const row = db.prepare('SELECT * FROM job_pipeline WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM job_pipeline WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
