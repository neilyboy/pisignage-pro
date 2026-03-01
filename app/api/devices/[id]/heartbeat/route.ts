import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const { asset_index, playlist_id, ip_address, resolution } = body;

  db.prepare(`
    UPDATE devices SET
      last_seen = unixepoch(),
      current_asset_index = COALESCE(?, current_asset_index),
      current_playlist_id = COALESCE(?, current_playlist_id),
      ip_address = COALESCE(?, ip_address),
      resolution = COALESCE(?, resolution),
      status = CASE WHEN status = 'pending' THEN 'pending' ELSE 'active' END
    WHERE id = ?
  `).run(asset_index ?? null, playlist_id ?? null, ip_address ?? null, resolution ?? null, params.id);

  const device = db.prepare('SELECT current_playlist_id, current_asset_index FROM devices WHERE id = ?').get(params.id) as { current_playlist_id: string | null; current_asset_index: number } | undefined;

  return NextResponse.json({ ok: true, playlist_id: device?.current_playlist_id ?? null });
}
