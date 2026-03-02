'use client';
import { useEffect, useState, useCallback } from 'react';
import type { PlannerEvent, KpiItem } from '@/lib/types';
import { getTheme, DEFAULT_THEME, type DayTheme } from '@/lib/themes';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  const diff = -d.getDay(); // Sunday is 0, so this snaps back to Sunday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280', normal: '#3b82f6', high: '#f59e0b', urgent: '#ef4444',
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'GEN', job: 'JOB', meeting: 'MTG', deadline: 'DL',
  travel: 'TRV', admin: 'ADM', personal: 'PRS',
};

// ─── Weather types ────────────────────────────────────────────────────────────
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

// ─── Live Clock ───────────────────────────────────────────────────────────────
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
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  return (
    <div className="text-right">
      <div className="text-5xl font-black tabular-nums tracking-tight leading-none" style={{ color: theme.textPrimary }}>
        {h12}:{m}<span className="text-3xl ml-0.5" style={{ color: theme.accent }}>{ampm}</span>
        <span className="text-2xl ml-1" style={{ color: theme.clockSeconds }}>{s}</span>
      </div>
      <div className="text-sm font-semibold mt-1 uppercase tracking-widest" style={{ color: theme.textMuted }}>{dayName} · {dateStr}</div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ item, theme }: { item: KpiItem; theme: DayTheme }) {
  const pct = item.target > 0 ? Math.min(100, (item.value / item.target) * 100) : 0;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: item.color + '12', border: `1px solid ${item.color}30` }}>
      <div className="text-xs font-black uppercase tracking-widest" style={{ color: item.color }}>{item.title}</div>
      {item.type === 'progress' && (
        <>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-black tabular-nums" style={{ color: theme.textPrimary }}>{item.value.toLocaleString()}<span className="text-sm ml-1" style={{ color: theme.textMuted }}>{item.unit}</span></span>
            <span className="text-lg font-bold" style={{ color: item.color }}>{Math.round(pct)}%</span>
          </div>
          <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.progressBg }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
          </div>
          <div className="text-xs" style={{ color: theme.textMuted }}>of {item.target.toLocaleString()} {item.unit}</div>
        </>
      )}
      {item.type === 'number' && (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black tabular-nums" style={{ color: theme.textPrimary }}>{item.value.toLocaleString()}</span>
          <span className="text-sm pb-1" style={{ color: theme.textMuted }}>{item.unit}</span>
        </div>
      )}
      {item.type === 'countdown' && (
        <>
          <span className="text-3xl font-black tabular-nums" style={{ color: item.color }}>{Math.max(0, item.target - item.value).toLocaleString()}</span>
          <div className="text-xs" style={{ color: theme.textMuted }}>{item.unit} remaining</div>
        </>
      )}
      {item.type === 'chart' && item.data.length > 0 && (() => {
        const max = Math.max(...item.data.map(d => d.value), 1);
        return (
          <div className="flex items-end gap-1 h-10">
            {item.data.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
                <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 36}px`, backgroundColor: item.color }} />
                <span className="text-[8px] truncate w-full text-center" style={{ color: theme.textMuted }}>{d.label}</span>
              </div>
            ))}
          </div>
        );
      })()}
      {item.notes && item.type !== 'chart' && <div className="text-xs truncate" style={{ color: theme.textMuted }}>{item.notes}</div>}
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────
function DayColumn({ date, events, isToday, theme }: { date: Date; events: PlannerEvent[]; isToday: boolean; theme: DayTheme }) {
  const sorted = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const completed = events.filter(e => e.completed).length;
  // Derive column bg from theme — slightly tinted for today
  const colBg = isToday ? theme.accent + '18' : theme.headerBorder + '40';
  const headerBg = isToday ? theme.accent : theme.headerBorder;
  return (
    <div className={`flex flex-col rounded-xl overflow-hidden flex-1 min-w-0 ${isToday ? 'ring-2' : ''}`}
      style={{ backgroundColor: colBg, ...(isToday ? { '--tw-ring-color': theme.accent, boxShadow: `0 0 0 2px ${theme.accent}` } as React.CSSProperties : {}) }}>
      <div className="px-3 py-2 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: headerBg + (isToday ? '' : '80') }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: isToday ? theme.textPrimary : theme.textMuted }}>{DAYS_SHORT[date.getDay()]}</span>
          <span className="text-xl font-black" style={{ color: theme.textPrimary }}>{date.getDate()}</span>
        </div>
        {events.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: isToday ? theme.accent + '60' : theme.progressBg, color: isToday ? theme.textPrimary : theme.textMuted }}>
            {completed}/{events.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden p-1.5 space-y-1">
        {sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: theme.textMuted }}>Clear</span>
          </div>
        ) : sorted.map(ev => (
          <div key={ev.id} className="rounded-lg px-2 py-1.5 flex flex-col gap-0.5 overflow-hidden"
            style={{ backgroundColor: ev.color + '22', borderLeft: `3px solid ${ev.color}`, opacity: ev.completed ? 0.5 : 1 }}>
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-xs font-bold truncate leading-tight" style={{ color: theme.textPrimary, textDecoration: ev.completed ? 'line-through' : 'none' }}>{ev.title}</span>
              <span className="text-[9px] font-bold flex-shrink-0 px-1 py-0.5 rounded"
                style={{ backgroundColor: PRIORITY_COLORS[ev.priority] + '30', color: PRIORITY_COLORS[ev.priority] }}>
                {CATEGORY_LABELS[ev.category] ?? ev.category.toUpperCase().slice(0, 3)}
              </span>
            </div>
            <div className="text-[10px]" style={{ color: theme.textMuted }}>{ev.start_time} → {ev.end_time}</div>
            {ev.notes && <div className="text-[9px] truncate" style={{ color: theme.textMuted }}>{ev.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export default function PlannerWidget() {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [view, setView] = useState<'week' | 'kpi'>('week');
  const [tick, setTick] = useState(0);
  const [theme, setTheme] = useState<DayTheme>(DEFAULT_THEME);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const weekStart = getSundayOfWeek(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayStr = formatDate(new Date());
  const weekParam = formatDate(weekStart);

  const load = useCallback(() => {
    fetch(`/api/planner?week=${weekParam}`).then(r => r.json()).then(setEvents).catch(() => {});
    fetch('/api/kpi').then(r => r.json()).then(setKpis).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      setTheme(getTheme(s.display_theme ?? 'midnight', s.display_theme_custom));
    }).catch(() => {});
    fetch('/api/weather').then(r => r.json()).then(d => {
      if (!d.error) setWeather(d as WeatherData);
    }).catch(() => {});
  }, [weekParam]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Auto-rotate between week and kpi views every 20s
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (kpis.length > 0) setView(v => v === 'week' ? 'kpi' : 'week');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const weekEnd = weekDates[6];
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: theme.bgGradient, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: theme.headerBorder }}>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>Weekly Operations</div>
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

      {/* View dots */}
      {kpis.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2">
          <div className="h-1.5 rounded-full transition-all" style={{ width: view === 'week' ? '24px' : '6px', backgroundColor: view === 'week' ? theme.accent : theme.textMuted + '60' }} />
          <div className="h-1.5 rounded-full transition-all" style={{ width: view === 'kpi' ? '24px' : '6px', backgroundColor: view === 'kpi' ? theme.accent : theme.textMuted + '60' }} />
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="flex-1 overflow-hidden px-4 pb-4 flex gap-2">
          {weekDates.map((date, i) => (
            <DayColumn key={i} date={date}
              events={events.filter(e => e.date === formatDate(date))}
              isToday={formatDate(date) === todayStr}
              theme={theme} />
          ))}
        </div>
      )}

      {/* KPI View */}
      {view === 'kpi' && (
        <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col gap-3">
          <div className="text-xs font-black uppercase tracking-[0.3em] pt-2" style={{ color: theme.textMuted }}>Key Performance Indicators</div>
          <div className="flex-1 grid gap-4" style={{
            gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
            gridTemplateRows: kpis.length > 4 ? '1fr 1fr' : '1fr',
          }}>
            {kpis.slice(0, 8).map(item => <KpiCard key={item.id} item={item} theme={theme} />)}
          </div>
        </div>
      )}

      {/* Bottom legend */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-2 border-t" style={{ borderColor: theme.headerBorder }}>
        <div className="flex gap-4">
          {[
            { cat: 'job', color: '#3b82f6' }, { cat: 'meeting', color: '#8b5cf6' },
            { cat: 'deadline', color: '#ef4444' }, { cat: 'travel', color: '#f59e0b' },
            { cat: 'admin', color: '#10b981' },
          ].map(({ cat, color }) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>{CATEGORY_LABELS[cat]}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: theme.gridLine }}>Live · updates every 30s</div>
      </div>
    </div>
  );
}
