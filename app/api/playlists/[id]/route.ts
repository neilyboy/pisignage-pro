import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function parsePlaylist(row: Record<string, unknown>) {
  const items = db.prepare(`
    SELECT pi.*, a.name as asset_name, a.type as asset_type, a.url as asset_url,
      a.file_path as asset_file_path, a.thumbnail_path as asset_thumbnail_path,
      a.duration as asset_duration, a.metadata as asset_metadata
    FROM playlist_items pi
    JOIN assets a ON a.id = pi.asset_id
    WHERE pi.playlist_id = ?
    ORDER BY pi.position
  `).all(row.id) as Record<string, unknown>[];
  return {
    ...row,
    loop: Boolean(row.loop),
    shuffle: Boolean(row.shuffle),
    items: items.map(item => ({
      ...item,
      asset: {
        id: item.asset_id,
        name: item.asset_name,
        type: item.asset_type,
        url: item.asset_url,
        file_path: item.asset_file_path,
        thumbnail_path: item.asset_thumbnail_path,
        duration: item.asset_duration,
        metadata: JSON.parse(item.asset_metadata as string || '{}'),
      },
    })),
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parsePlaylist(row));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, description, loop, shuffle, transition, items } = body;

  db.prepare(`
    UPDATE playlists SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      loop = COALESCE(?, loop),
      shuffle = COALESCE(?, shuffle),
      transition = COALESCE(?, transition),
      updated_at = unixepoch()
    WHERE id = ?
  `).run(name ?? null, description ?? null, loop !== undefined ? (loop ? 1 : 0) : null,
    shuffle !== undefined ? (shuffle ? 1 : 0) : null, transition ?? null, params.id);

  if (Array.isArray(items)) {
    db.prepare('DELETE FROM playlist_items WHERE playlist_id = ?').run(params.id);
    const insert = db.prepare(`
      INSERT INTO playlist_items (id, playlist_id, asset_id, position, duration_override)
      VALUES (?, ?, ?, ?, ?)
    `);
    items.forEach((item: { asset_id: string; duration_override?: number }, i: number) => {
      insert.run(generateId(), params.id, item.asset_id, i, item.duration_override ?? null);
    });
  }

  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json(parsePlaylist(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
