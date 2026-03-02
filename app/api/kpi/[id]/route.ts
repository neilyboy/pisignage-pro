import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseKpi(row: Record<string, unknown>) {
  return { ...row, data: JSON.parse((row.data as string) || '[]') };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const now = Math.floor(Date.now() / 1000);
  ;(db as import('better-sqlite3').Database).prepare(`
    UPDATE kpi_items SET
      title = ?, type = ?, value = ?, target = ?, unit = ?,
      color = ?, data = ?, notes = ?, position = ?, updated_at = ?
    WHERE id = ?
  `).run(
    body.title, body.type, body.value ?? 0, body.target ?? 100,
    body.unit ?? '', body.color ?? '#3b82f6',
    JSON.stringify(body.data ?? []),
    body.notes ?? null, body.position ?? 0, now, params.id
  );
  const row = (db as import('better-sqlite3').Database).prepare('SELECT * FROM kpi_items WHERE id = ?').get(params.id);
  return NextResponse.json(parseKpi(row as Record<string, unknown>));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  ;(db as import('better-sqlite3').Database).prepare('DELETE FROM kpi_items WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
