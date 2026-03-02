import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseEvent(row: Record<string, unknown>) {
  return { ...row, completed: row.completed === 1 };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const now = Math.floor(Date.now() / 1000);
  ;(db as import('better-sqlite3').Database).prepare(`
    UPDATE planner_events SET
      title = ?, notes = ?, date = ?, start_time = ?, end_time = ?,
      color = ?, category = ?, priority = ?, completed = ?, updated_at = ?
    WHERE id = ?
  `).run(
    body.title, body.notes ?? null, body.date, body.start_time, body.end_time,
    body.color ?? '#3b82f6', body.category ?? 'general', body.priority ?? 'normal',
    body.completed ? 1 : 0, now, params.id
  );
  const row = (db as import('better-sqlite3').Database).prepare('SELECT * FROM planner_events WHERE id = ?').get(params.id);
  return NextResponse.json(parseEvent(row as Record<string, unknown>));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  ;(db as import('better-sqlite3').Database).prepare('DELETE FROM planner_events WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
