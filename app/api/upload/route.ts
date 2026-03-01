import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: NextRequest) {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  const filename = `${generateId()}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  return NextResponse.json({
    url: `/uploads/${filename}`,
    filename,
    size: buffer.length,
    type: file.type,
  });
}
