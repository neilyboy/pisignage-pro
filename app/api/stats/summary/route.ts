import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const totalDevices = (db.prepare('SELECT COUNT(*) as c FROM devices').get() as { c: number }).c;
  const pendingDevices = (db.prepare("SELECT COUNT(*) as c FROM devices WHERE status = 'pending'").get() as { c: number }).c;
  const onlineCutoff = Math.floor(Date.now() / 1000) - 30;
  const activeDevices = (db.prepare('SELECT COUNT(*) as c FROM devices WHERE last_seen > ? AND status != ?').get(onlineCutoff, 'pending') as { c: number }).c;
  const totalAssets = (db.prepare('SELECT COUNT(*) as c FROM assets').get() as { c: number }).c;
  const totalPlaylists = (db.prepare('SELECT COUNT(*) as c FROM playlists').get() as { c: number }).c;
  const totalSchedules = (db.prepare('SELECT COUNT(*) as c FROM schedules WHERE active = 1').get() as { c: number }).c;

  return NextResponse.json({ totalDevices, activeDevices, pendingDevices, totalAssets, totalPlaylists, totalSchedules });
}
