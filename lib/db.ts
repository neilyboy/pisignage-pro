import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Lazy singleton — DB file is only opened on the first actual call.
// This prevents SQLITE_BUSY during `next build` where multiple parallel
// workers import this module but never actually invoke any DB methods.
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(path.join(DATA_DIR, 'pisignage.db'), { timeout: 15000 });
  _db.pragma('busy_timeout = 15000');
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(`
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

  CREATE TABLE IF NOT EXISTS planner_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'normal',
    completed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS kpi_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL DEFAULT 0,
    target REAL DEFAULT 100,
    unit TEXT DEFAULT '',
    color TEXT DEFAULT '#3b82f6',
    data TEXT DEFAULT '[]',
    notes TEXT,
    position INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_planner_date ON planner_events(date);

  CREATE TABLE IF NOT EXISTS job_cards (
    id TEXT PRIMARY KEY,
    week_start TEXT NOT NULL,
    day TEXT NOT NULL,
    job_name TEXT NOT NULL,
    location TEXT DEFAULT '',
    description TEXT DEFAULT '',
    techs TEXT DEFAULT '[]',
    color TEXT DEFAULT '#3b82f6',
    position INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_job_cards_week ON job_cards(week_start);

  CREATE TABLE IF NOT EXISTS job_pipeline (
    id TEXT PRIMARY KEY,
    job_name TEXT NOT NULL,
    client TEXT DEFAULT '',
    location TEXT DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'walkthru-req',
    hours REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    color TEXT DEFAULT '#3b82f6',
    position INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('brand_logo_url', ''),
    ('brand_position', 'bottom-right'),
    ('brand_size', '120'),
    ('brand_enabled', 'false'),
    ('work_start', '08:00'),
    ('work_end', '17:00');
`);
  // Migrations — safe to run repeatedly
  try { _db.exec(`ALTER TABLE assets ADD COLUMN folder TEXT DEFAULT NULL`); } catch {}
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_folder ON assets(folder)`); } catch {}
  try { _db.exec(`ALTER TABLE announcements ADD COLUMN start_at INTEGER DEFAULT NULL`); } catch {}
  // Weather settings defaults
  const wx = _db.prepare(`SELECT value FROM settings WHERE key = 'weather_api_key'`).get();
  if (!wx) {
    _db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run('weather_api_key', '');
    _db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run('weather_location', '');
    _db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run('weather_units', 'imperial');
  }

  return _db;
}

const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default db;
