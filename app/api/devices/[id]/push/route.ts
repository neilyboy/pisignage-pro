import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { pushToDevice } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { type, playlist_id, announcement } = body;

  if (type === 'playlist' && playlist_id) {
    db.prepare('UPDATE devices SET current_playlist_id = ? WHERE id = ?').run(playlist_id, params.id);
    pushToDevice(params.id, { type: 'playlist', playlist_id });
    return NextResponse.json({ success: true });
  }

  if (type === 'announcement' && announcement) {
    pushToDevice(params.id, { type: 'announcement', text: announcement });
    return NextResponse.json({ success: true });
  }

  if (type === 'reload') {
    pushToDevice(params.id, { type: 'reload' });
    return NextResponse.json({ success: true });
  }

  if (type === 'brightness') {
    db.prepare('UPDATE devices SET brightness = ? WHERE id = ?').run(body.brightness, params.id);
    pushToDevice(params.id, { type: 'brightness', value: body.brightness });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown push type' }, { status: 400 });
}
