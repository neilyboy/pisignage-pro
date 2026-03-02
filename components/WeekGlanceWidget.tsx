'use client';
import { useEffect, useState, useCallback } from 'react';
import type { JobCard } from '@/lib/types';
import { getTheme, DEFAULT_THEME, type DayTheme } from '@/lib/themes';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WeatherData {
  city: string; country: string; temp: number; description: string; icon: string; units: string;
}

function weatherEmoji(icon: string): string {
  const code = icon.replace('n', 'd');
  const map: Record<string, string> = {
    '01d': '☀️', '02d': '🌤️', '03d': '🌥️', '04d': '☁️',
    '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
  };
  return map[code] ?? '🌡️';
}

function LiveClock({ theme }: { theme: DayTheme }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return (
    <div className="tabular-nums text-right leading-none">
      <span className="text-5xl font-black" style={{ color: theme.textPrimary }}>{h12}:{m}</span>
      <span className="text-2xl font-black ml-1" style={{ color: theme.accent }}>{ampm}</span>
      <span className="text-xl ml-1.5" style={{ color: theme.clockSeconds }}>{s}</span>
    </div>
  );
}

export default function WeekGlanceWidget() {
  const [cards, setCards] = useState<JobCard[]>([]);
  const [theme, setTheme] = useState<DayTheme>(DEFAULT_THEME);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [now, setNow] = useState(new Date());

  const weekStart = getSundayOfWeek(new Date());
  const weekStr = formatDate(weekStart);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  const weekEnd = weekDates[6];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const load = useCallback(() => {
    fetch(`/api/job-cards?week=${weekStr}`).then(r => r.json()).then(setCards).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      setTheme(getTheme(s.display_theme ?? 'midnight', s.display_theme_custom));
    }).catch(() => {});
    fetch('/api/weather').then(r => r.json()).then(d => {
      if (!d.error) setWeather(d as WeatherData);
    }).catch(() => {});
  }, [weekStr]);

  useEffect(() => {
    load();
    const dataTimer = setInterval(load, 30000);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(dataTimer); clearInterval(clockTimer); };
  }, [load]);

  const todayStr = formatDate(now);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: theme.bgGradient, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: theme.headerBorder }}>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>Week at a Glance</div>
            <div className="text-2xl font-black uppercase tracking-wider" style={{ color: theme.textPrimary }}>{weekLabel}</div>
          </div>
          {weather && (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl"
              style={{ backgroundColor: theme.accent + '15', border: `1px solid ${theme.accent}30` }}>
              <span className="text-3xl leading-none">{weatherEmoji(weather.icon)}</span>
              <div>
                <div className="text-2xl font-black tabular-nums leading-none" style={{ color: theme.textPrimary }}>
                  {weather.temp}°{weather.units === 'imperial' ? 'F' : weather.units === 'metric' ? 'C' : 'K'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider capitalize" style={{ color: theme.textMuted }}>
                  {weather.description} · {weather.city}
                </div>
              </div>
            </div>
          )}
        </div>
        <LiveClock theme={theme} />
      </div>

      {/* Day columns */}
      <div className="flex-1 overflow-hidden px-4 pb-4 pt-3 flex gap-3">
        {weekDates.map((date, i) => {
          const dayName = DAYS[i];
          const dateStr = formatDate(date);
          const isToday = dateStr === todayStr;
          const dayCards = cards.filter(c => c.day === dayName);

          return (
            <div key={dayName} className="flex-1 flex flex-col rounded-xl overflow-hidden min-w-0"
              style={{
                backgroundColor: isToday ? theme.accent + '18' : theme.headerBorder + '30',
                boxShadow: isToday ? `0 0 0 2px ${theme.accent}` : undefined,
              }}>
              {/* Day header */}
              <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between"
                style={{ backgroundColor: isToday ? theme.accent + '30' : theme.headerBorder + '60' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest"
                    style={{ color: isToday ? theme.textPrimary : theme.textMuted }}>
                    {dayName.slice(0, 3)}
                  </span>
                  <span className="text-xl font-black" style={{ color: theme.textPrimary }}>
                    {date.getDate()}
                  </span>
                </div>
                {dayCards.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: isToday ? theme.accent + '50' : theme.progressBg, color: isToday ? theme.textPrimary : theme.textMuted }}>
                    {dayCards.length}
                  </span>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-hidden p-2 space-y-2">
                {dayCards.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: theme.textMuted }}>Clear</span>
                  </div>
                ) : dayCards.map(card => (
                  <div key={card.id} className="rounded-xl p-2.5 overflow-hidden"
                    style={{ backgroundColor: card.color + '20', borderLeft: `3px solid ${card.color}` }}>
                    <div className="font-black text-sm leading-tight truncate" style={{ color: theme.textPrimary }}>
                      {card.job_name}
                    </div>
                    {card.location && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] leading-none">📍</span>
                        <span className="text-[10px] font-bold truncate" style={{ color: card.color }}>{card.location}</span>
                      </div>
                    )}
                    {card.description && (
                      <div className="text-[10px] mt-1.5 leading-relaxed line-clamp-3" style={{ color: theme.textMuted }}>
                        {card.description}
                      </div>
                    )}
                    {card.techs.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>Techs</div>
                        <div className="flex flex-wrap gap-1">
                          {card.techs.map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                              style={{ backgroundColor: card.color + '30', color: card.color }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
