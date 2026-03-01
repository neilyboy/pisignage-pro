import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function parseAsset(row: Record<string, unknown>) {
  return {
    ...row,
    metadata: JSON.parse(row.metadata as string || '{}'),
    tags: JSON.parse(row.tags as string || '[]'),
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parseAsset(row));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, type, url, duration, metadata, tags } = body;
  db.prepare(`
    UPDATE assets SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      url = COALESCE(?, url),
      duration = COALESCE(?, duration),
      metadata = COALESCE(?, metadata),
      tags = COALESCE(?, tags),
      updated_at = unixepoch()
    WHERE id = ?
  `).run(
    name ?? null, type ?? null, url ?? null, duration ?? null,
    metadata ? JSON.stringify(metadata) : null,
    tags ? JSON.stringify(tags) : null,
    params.id,
  );
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json(parseAsset(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = db.prepare('SELECT file_path, thumbnail_path FROM assets WHERE id = ?').get(params.id) as { file_path: string | null; thumbnail_path: string | null } | undefined;
  if (row?.file_path) {
    const abs = path.join(process.cwd(), 'public', row.file_path);
    try { fs.unlinkSync(abs); } catch {}
  }
  if (row?.thumbnail_path) {
    const abs = path.join(process.cwd(), 'public', row.thumbnail_path);
    try { fs.unlinkSync(abs); } catch {}
  }
  db.prepare('DELETE FROM assets WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
