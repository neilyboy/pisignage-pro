import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseCard(row: Record<string, unknown>) {
  return { ...row, techs: JSON.parse((row.techs as string) || '[]') };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { week_start, day, job_name, location, description, techs, color, position } = body;
  db.prepare(`
    UPDATE job_cards SET
      week_start = COALESCE(?, week_start),
      day = COALESCE(?, day),
      job_name = COALESCE(?, job_name),
      location = COALESCE(?, location),
      description = COALESCE(?, description),
      techs = COALESCE(?, techs),
      color = COALESCE(?, color),
      position = COALESCE(?, position),
      updated_at = unixepoch()
    WHERE id = ?
  `).run(
    week_start ?? null, day ?? null, job_name ?? null, location ?? null,
    description ?? null, techs ? JSON.stringify(techs) : null, color ?? null, position ?? null,
    params.id,
  );
  const row = db.prepare('SELECT * FROM job_cards WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json(parseCard(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM job_cards WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
