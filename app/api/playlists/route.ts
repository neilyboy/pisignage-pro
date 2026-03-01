import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function parsePlaylist(row: Record<string, unknown>, withItems = false) {
  const playlist = {
    ...row,
    loop: Boolean(row.loop),
    shuffle: Boolean(row.shuffle),
    items: [] as unknown[],
  };
  if (withItems) {
    const items = db.prepare(`
      SELECT pi.*, a.name as asset_name, a.type as asset_type, a.url as asset_url,
        a.file_path as asset_file_path, a.thumbnail_path as asset_thumbnail_path,
        a.duration as asset_duration, a.metadata as asset_metadata
      FROM playlist_items pi
      JOIN assets a ON a.id = pi.asset_id
      WHERE pi.playlist_id = ?
      ORDER BY pi.position
    `).all(row.id) as Record<string, unknown>[];
    playlist.items = items.map(item => ({
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
    }));
  }
  return playlist;
}

export async function GET() {
  const rows = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(r => parsePlaylist(r, true)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, loop, shuffle, transition } = body;
  const id = generateId();
  db.prepare(`
    INSERT INTO playlists (id, name, description, loop, shuffle, transition)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, description ?? null, loop ? 1 : 0, shuffle ? 1 : 0, transition ?? 'fade');
  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json(parsePlaylist(row, true), { status: 201 });
}
