import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseCard(row: Record<string, unknown>) {
  return {
    ...row,
    techs: JSON.parse((row.techs as string) || '[]'),
  };
}

export async function GET(req: NextRequest) {
  const week = new URL(req.url).searchParams.get('week');
  const rows = week
    ? (db.prepare('SELECT * FROM job_cards WHERE week_start = ? ORDER BY position ASC, created_at ASC').all(week) as Record<string, unknown>[])
    : (db.prepare('SELECT * FROM job_cards ORDER BY week_start DESC, position ASC, created_at ASC').all() as Record<string, unknown>[]);
  return NextResponse.json(rows.map(parseCard));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { week_start, day, job_name, location, description, techs, color, position } = body;
  const id = generateId();
  db.prepare(`
    INSERT INTO job_cards (id, week_start, day, job_name, location, description, techs, color, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, week_start, day, job_name, location ?? '', description ?? '', JSON.stringify(techs ?? []), color ?? '#3b82f6', position ?? 0);
  const row = db.prepare('SELECT * FROM job_cards WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json(parseCard(row), { status: 201 });
}
