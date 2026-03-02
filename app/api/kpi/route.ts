import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function parseKpi(row: Record<string, unknown>) {
  return {
    ...row,
    data: JSON.parse((row.data as string) || '[]'),
  };
}

export async function GET() {
  const rows = (db as import('better-sqlite3').Database)
    .prepare('SELECT * FROM kpi_items ORDER BY position, created_at')
    .all();
  return NextResponse.json((rows as Record<string, unknown>[]).map(parseKpi));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const count = (db as import('better-sqlite3').Database)
    .prepare('SELECT COUNT(*) as c FROM kpi_items')
    .get() as { c: number };
  ;(db as import('better-sqlite3').Database).prepare(`
    INSERT INTO kpi_items (id, title, type, value, target, unit, color, data, notes, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.title, body.type ?? 'progress',
    body.value ?? 0, body.target ?? 100,
    body.unit ?? '', body.color ?? '#3b82f6',
    JSON.stringify(body.data ?? []),
    body.notes ?? null, count.c, now, now
  );
  const row = (db as import('better-sqlite3').Database).prepare('SELECT * FROM kpi_items WHERE id = ?').get(id);
  return NextResponse.json(parseKpi(row as Record<string, unknown>), { status: 201 });
}
