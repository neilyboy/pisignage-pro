'use client';
import { useEffect, useState } from 'react';
import { getTheme, DEFAULT_THEME, type DayTheme } from '@/lib/themes';

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  units: string;
}

const ICON_MAP: Record<string, string> = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '🌙',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<DayTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      setTheme(getTheme(s.display_theme ?? 'midnight', s.display_theme_custom));
    }).catch(() => {});
    fetch('/api/weather').then(r => r.json()).then((d: WeatherData & { error?: string }) => {
      if (d.error) { setError(d.error); setWeather(null); }
      else { setWeather(d); setError(null); }
      setLoading(false);
    }).catch(e => { setError(String(e)); setLoading(false); });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 300000); // refresh every 5 min
    return () => clearInterval(t);
  }, []);

  const tempUnit = weather?.units === 'metric' ? '°C' : weather?.units === 'standard' ? 'K' : '°F';
  const speedUnit = weather?.units === 'metric' ? 'm/s' : 'mph';
  const emoji = weather ? (ICON_MAP[weather.icon] ?? '🌡️') : '🌡️';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: theme.bgGradient, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {loading && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-7xl animate-pulse">🌤️</div>
          <div className="text-xl font-bold" style={{ color: theme.textMuted }}>Loading weather…</div>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="text-7xl">⚙️</div>
          <div className="text-2xl font-black" style={{ color: theme.textPrimary }}>Weather Not Configured</div>
          <div className="text-base" style={{ color: theme.textMuted }}>{error}</div>
          <div className="text-sm mt-2 px-6 py-3 rounded-xl" style={{ backgroundColor: theme.headerBorder + '60', color: theme.textSecondary }}>
            Add your OpenWeatherMap API key and location in <strong>Settings → Weather</strong>
          </div>
        </div>
      )}

      {!loading && weather && (
        <div className="w-full h-full flex flex-col px-12 py-8 justify-between">
          {/* Location + icon */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: theme.accent }}>Current Weather</div>
              <div className="text-4xl font-black leading-tight mt-1" style={{ color: theme.textPrimary }}>
                {weather.city}, {weather.country}
              </div>
              <div className="text-lg mt-1 font-medium" style={{ color: theme.textSecondary }}>
                {capitalize(weather.description)}
              </div>
            </div>
            <div className="text-9xl leading-none select-none mt-2">{emoji}</div>
          </div>

          {/* Temperature */}
          <div className="text-center">
            <div className="font-black tabular-nums leading-none" style={{
              fontSize: 'clamp(5rem, 18vw, 14rem)',
              color: theme.textPrimary,
            }}>
              {weather.temp}<span style={{ fontSize: '0.4em', color: theme.accent }}>{tempUnit}</span>
            </div>
            <div className="text-2xl font-semibold -mt-2" style={{ color: theme.textMuted }}>
              Feels like {weather.feels_like}{tempUnit}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Humidity', value: `${weather.humidity}%`, icon: '💧' },
              { label: 'Wind', value: `${weather.wind_speed} ${speedUnit}`, icon: '💨' },
              { label: 'Condition', value: capitalize(weather.description), icon: emoji },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-2xl p-4 text-center"
                style={{ backgroundColor: theme.headerBorder + '50', border: `1px solid ${theme.headerBorder}` }}>
                <div className="text-3xl mb-1">{icon}</div>
                <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>{label}</div>
                <div className="text-xl font-black" style={{ color: theme.textPrimary }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
