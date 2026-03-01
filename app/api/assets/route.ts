import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function parseAsset(row: Record<string, unknown>) {
  return {
    ...row,
    metadata: JSON.parse(row.metadata as string || '{}'),
    tags: JSON.parse(row.tags as string || '[]'),
  };
}

export async function GET() {
  const rows = db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(parseAsset));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, url, file_path, thumbnail_path, duration, metadata, tags } = body;

  const id = generateId();
  db.prepare(`
    INSERT INTO assets (id, name, type, url, file_path, thumbnail_path, duration, metadata, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, type,
    url ?? null, file_path ?? null, thumbnail_path ?? null,
    duration ?? 10,
    JSON.stringify(metadata ?? {}),
    JSON.stringify(tags ?? []),
  );

  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json(parseAsset(row), { status: 201 });
}
