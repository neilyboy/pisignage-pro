import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// Pi polls this to check if it's been adopted
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const device = db.prepare('SELECT * FROM devices WHERE pairing_code = ?').get(code) as Record<string, unknown> | undefined;
  if (!device) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({
    id: device.id,
    status: device.status,
    name: device.name,
    adopted: device.status !== 'pending',
  });
}
