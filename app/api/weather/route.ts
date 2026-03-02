import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN ('weather_api_key','weather_location','weather_units')`).all() as { key: string; value: string }[];
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;

  const apiKey = s.weather_api_key ?? '';
  const location = s.weather_location ?? '';
  const units = s.weather_units ?? 'imperial';

  if (!apiKey || !location) {
    return NextResponse.json({ error: 'Weather not configured' }, { status: 422 });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${units}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: (err as { message?: string }).message ?? 'Weather API error' }, { status: res.status });
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
