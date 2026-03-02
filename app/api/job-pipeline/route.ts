import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function GET() {
  const rows = db.prepare('SELECT * FROM job_pipeline ORDER BY stage ASC, position ASC, created_at ASC').all() as Record<string, unknown>[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { job_name, client, location, stage, hours, notes, color, position } = body;
  const id = generateId();
  db.prepare(`
    INSERT INTO job_pipeline (id, job_name, client, location, stage, hours, notes, color, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, job_name, client ?? '', location ?? '', stage ?? 'walkthru-req', hours ?? 0, notes ?? '', color ?? '#3b82f6', position ?? 0);
  const row = db.prepare('SELECT * FROM job_pipeline WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json(row, { status: 201 });
}
