import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function parseEvent(row: Record<string, unknown>) {
  return {
    ...row,
    completed: row.completed === 1,
    data: [],
  };
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');
  const todayOnly = searchParams.get('today') === '1';
  let rows;
  if (todayOnly) {
    // Use server local date — avoids Pi browser UTC timezone mismatch
    const today = localDateStr(new Date());
    rows = (db as import('better-sqlite3').Database)
      .prepare('SELECT * FROM planner_events WHERE date = ? ORDER BY start_time')
      .all(today);
  } else if (week) {
    const start = new Date(week);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const placeholders = dates.map(() => '?').join(',');
    rows = (db as import('better-sqlite3').Database)
      .prepare(`SELECT * FROM planner_events WHERE date IN (${placeholders}) ORDER BY date, start_time`)
      .all(...dates);
  } else {
    rows = (db as import('better-sqlite3').Database)
      .prepare('SELECT * FROM planner_events ORDER BY date, start_time')
      .all();
  }
  return NextResponse.json((rows as Record<string, unknown>[]).map(parseEvent));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  ;(db as import('better-sqlite3').Database).prepare(`
    INSERT INTO planner_events (id, title, notes, date, start_time, end_time, color, category, priority, completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.title, body.notes ?? null, body.date, body.start_time, body.end_time,
    body.color ?? '#3b82f6', body.category ?? 'general', body.priority ?? 'normal',
    body.completed ? 1 : 0, now, now
  );
  const row = (db as import('better-sqlite3').Database).prepare('SELECT * FROM planner_events WHERE id = ?').get(id);
  return NextResponse.json(parseEvent(row as Record<string, unknown>), { status: 201 });
}
