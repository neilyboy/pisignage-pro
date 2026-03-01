import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId, generatePairingCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ip_address, version, resolution } = body;

  const code = generatePairingCode();
  const id = generateId();

  db.prepare(`
    INSERT INTO devices (id, pairing_code, ip_address, version, resolution, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(id, code, ip_address ?? null, version ?? null, resolution ?? null);

  return NextResponse.json({ id, pairing_code: code });
}
