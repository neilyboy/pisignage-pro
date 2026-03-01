import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'pisignage.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT,
    location TEXT,
    pairing_code TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    ip_address TEXT,
    last_seen INTEGER,
    current_playlist_id TEXT,
    current_asset_index INTEGER DEFAULT 0,
    orientation TEXT DEFAULT 'landscape',
    brightness INTEGER DEFAULT 100,
    resolution TEXT,
    version TEXT,
    notes TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    file_path TEXT,
    thumbnail_path TEXT,
    duration INTEGER DEFAULT 10,
    metadata TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    loop INTEGER DEFAULT 1,
    shuffle INTEGER DEFAULT 0,
    transition TEXT DEFAULT 'fade',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS playlist_items (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    duration_override INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    days TEXT DEFAULT '[]',
    recurrence TEXT DEFAULT 'weekly',
    active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    color TEXT DEFAULT '#ffffff',
    bg_color TEXT DEFAULT '#1a1a2e',
    speed INTEGER DEFAULT 50,
    device_ids TEXT DEFAULT '[]',
    active INTEGER DEFAULT 1,
    expires_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    asset_id TEXT,
    playlist_id TEXT,
    event TEXT NOT NULL,
    duration INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_analytics_device ON analytics(device_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);
  CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id, position);
  CREATE INDEX IF NOT EXISTS idx_schedules_device ON schedules(device_id);
`);

export default db;
