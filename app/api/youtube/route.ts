import { NextRequest, NextResponse } from 'next/server';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { generateId } from '@/lib/utils';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function findYtdlp(): string | null {
  for (const p of ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp', '/home/' + process.env.USER + '/.local/bin/yt-dlp']) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { url, name } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const ytdlp = findYtdlp();
  if (!ytdlp) return NextResponse.json({ error: 'yt-dlp not installed. Run: pip3 install yt-dlp' }, { status: 500 });

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const id = generateId();
  const outPath = path.join(UPLOADS_DIR, `${id}.mp4`);
  const thumbPath = path.join(UPLOADS_DIR, `${id}_thumb.jpg`);

  // Insert pending asset
  db.prepare(`INSERT INTO assets (id, name, type, url, file_path, duration, metadata, tags)
    VALUES (?, ?, 'youtube', ?, NULL, 0, ?, '[]')`)
    .run(id, name ?? url, url, JSON.stringify({ status: 'downloading', progress: 0 }));

  // Download in background
  (async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(ytdlp, [
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format', 'mp4',
          '--write-thumbnail',
          '--convert-thumbnails', 'jpg',
          '-o', outPath,
          url,
        ]);
        child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`yt-dlp exit ${code}`)));
        child.on('error', reject);
      });

      // Get duration via ffprobe
      let duration = 30;
      try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outPath}"`).toString();
        duration = Math.round(parseFloat(out));
      } catch {}

      const thumbExists = fs.existsSync(thumbPath);
      db.prepare(`UPDATE assets SET file_path = ?, thumbnail_path = ?, duration = ?, metadata = ?, updated_at = unixepoch() WHERE id = ?`)
        .run(`/uploads/${id}.mp4`, thumbExists ? `/uploads/${id}_thumb.jpg` : null, duration,
          JSON.stringify({ status: 'ready', source: url }), id);
    } catch (e) {
      db.prepare(`UPDATE assets SET metadata = ? WHERE id = ?`)
        .run(JSON.stringify({ status: 'error', error: String(e) }), id);
    }
  })();

  return NextResponse.json({ id, status: 'downloading' });
}
