import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN ('weather_api_key','weather_location','weather_units')`).all() as { key: string; value: string }[];
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;

  const apiKey = (s.weather_api_key ?? '').trim();
  const location = s.weather_location ?? '';
  const units = s.weather_units ?? 'imperial';

  if (!apiKey || !location) {
    return NextResponse.json({ error: 'Weather not configured' }, { status: 422 });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${units}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { message?: string }).message ?? 'Weather API error';
      const friendlyMsg = (res.status === 401 || res.status === 403)
        ? 'Invalid API key. New OpenWeatherMap keys can take up to 2 hours to activate after account creation.'
        : res.status === 404
        ? `Location "${location}" not found. Try format: City, COUNTRY_CODE (e.g. Peoria, US)`
        : msg;
      return NextResponse.json({ error: friendlyMsg }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({
      city: data.name,
      country: data.sys?.country,
      temp: Math.round(data.main?.temp),
      feels_like: Math.round(data.main?.feels_like),
      humidity: data.main?.humidity,
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
      wind_speed: Math.round(data.wind?.speed),
      units,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
