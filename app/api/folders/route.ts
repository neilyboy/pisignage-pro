import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = db.prepare(
    `SELECT DISTINCT folder FROM assets WHERE folder IS NOT NULL AND folder != '' ORDER BY folder ASC`
  ).all() as { folder: string }[];
  return NextResponse.json(rows.map(r => r.folder));
}

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  return NextResponse.json({ name: name.trim() });
}
