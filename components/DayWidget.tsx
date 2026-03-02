'use client';
import { useEffect, useState, useCallback } from 'react';
import type { PlannerEvent, KpiItem } from '@/lib/types';
import { getTheme, DEFAULT_THEME, type DayTheme } from '@/lib/themes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  general:  { label: 'General',      color: '#6b7280' },
  job:      { label: 'Job/Project',  color: '#3b82f6' },
  meeting:  { label: 'Meeting',      color: '#8b5cf6' },
  deadline: { label: 'Deadline',     color: '#ef4444' },
  travel:   { label: 'Travel',       color: '#f59e0b' },
  admin:    { label: 'Admin',        color: '#10b981' },
  personal: { label: 'Personal',     color: '#ec4899' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  low:    { label: 'Low',    color: '#6b7280', icon: '▽' },
  normal: { label: 'Normal', color: '#3b82f6', icon: '◇' },
  high:   { label: 'High',   color: '#f59e0b', icon: '△' },
  urgent: { label: 'Urgent', color: '#ef4444', icon: '▲' },
};

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

  return (
    <div className="tabular-nums text-right leading-none">
      <span className="text-6xl font-black" style={{ color: theme.textPrimary }}>{h12}:{m}</span>
      <span className="text-3xl font-black ml-1" style={{ color: theme.accent }}>{ampm}</span>
      <span className="text-2xl ml-2" style={{ color: theme.clockSeconds }}>{s}</span>
    </div>
  );
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12} ${ampm}`;
}

// ─── Progress bar for the day timeline ───────────────────────────────────────
function DayProgress({ nowH, startH, endH, theme }: { nowH: number; startH: number; endH: number; theme: DayTheme }) {
  const pct = Math.max(0, Math.min(100, ((nowH - startH) / (endH - startH)) * 100));
  const label = (() => {
    const remaining = endH - nowH;
    if (remaining <= 0) return 'Work day complete';
    if (nowH < startH) {
      const until = startH - nowH;
      const h = Math.floor(until);
      const m = Math.round((until - h) * 60);
      return h > 0 ? `Work starts in ${h}h ${m}m` : `Work starts in ${m}m`;
    }
    const hrs = Math.floor(remaining);
    const mins = Math.round((remaining - hrs) * 60);
    return hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`;
  })();

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
        <span>{formatHour(startH)}</span>
        <span style={{ color: theme.accent }}>{label}</span>
        <span>{formatHour(endH)}</span>
      </div>
      <div className="w-full rounded-full h-2 relative" style={{ backgroundColor: theme.progressBg }}>
        <div className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: theme.progressFill }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
          style={{ left: `calc(${pct}% - 6px)`, backgroundColor: theme.textPrimary, borderColor: theme.accent, boxShadow: `0 0 8px ${theme.accent}80` }} />
      </div>
    </div>
  );
}

// ─── Proportional timeline ────────────────────────────────────────────────────
function TimelineView({ events, nowH, workStart, workEnd, theme }: {
  events: PlannerEvent[]; nowH: number; workStart: number; workEnd: number; theme: DayTheme;
}) {
  const daySpan = workEnd - workStart;
  if (daySpan <= 0) return null;

  // Position of "now" line as percentage
  const nowPct = Math.max(0, Math.min(100, ((nowH - workStart) / daySpan) * 100));
  const isWorkDay = nowH >= workStart && nowH <= workEnd;

  // Hour tick marks
  const ticks: number[] = [];
  for (let h = Math.ceil(workStart); h < workEnd; h++) ticks.push(h);

  return (
    <div className="relative w-full h-full flex">
      {/* Time axis */}
      <div className="flex-shrink-0 w-16 relative">
        {ticks.map(h => {
          const pct = ((h - workStart) / daySpan) * 100;
          const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
          return (
            <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-bold tabular-nums"
              style={{ top: `${pct}%`, color: theme.textMuted }}>
              {label}
            </div>
          );
        })}
        {/* Work start / end labels */}
        <div className="absolute right-2 text-[10px] font-bold" style={{ top: '0%', color: theme.accent }}>
          {workStart % 1 === 0 ? `${workStart === 0 ? 12 : workStart > 12 ? workStart - 12 : workStart}${workStart < 12 ? 'a' : 'p'}` : formatTime12(`${Math.floor(workStart)}:${String(Math.round((workStart % 1) * 60)).padStart(2, '0')}`)}
        </div>
        <div className="absolute right-2 -translate-y-full text-[10px] font-bold" style={{ top: '100%', color: theme.accent }}>
          {workEnd % 1 === 0 ? `${workEnd === 0 ? 12 : workEnd > 12 ? workEnd - 12 : workEnd}${workEnd < 12 ? 'a' : 'p'}` : formatTime12(`${Math.floor(workEnd)}:${String(Math.round((workEnd % 1) * 60)).padStart(2, '0')}`)}
        </div>
      </div>

      {/* Timeline column */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {/* Hour grid lines */}
        {ticks.map(h => {
          const pct = ((h - workStart) / daySpan) * 100;
          return (
            <div key={h} className="absolute left-0 right-0 border-t" style={{ top: `${pct}%`, borderColor: theme.gridLine }} />
          );
        })}

        {/* Now line */}
        {isWorkDay && (
          <div className="absolute left-0 right-0 z-20" style={{ top: `${nowPct}%` }}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ marginLeft: '-4px', backgroundColor: theme.nowLine }} />
              <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: theme.nowLine + 'cc' }} />
            </div>
          </div>
        )}

        {/* Event blocks */}
        {events.map(ev => {
          const evStart = parseTime(ev.start_time);
          const evEnd = parseTime(ev.end_time);
          const clampedStart = Math.max(evStart, workStart);
          const clampedEnd = Math.min(evEnd, workEnd);
          if (clampedEnd <= clampedStart) return null;

          const topPct = ((clampedStart - workStart) / daySpan) * 100;
          const heightPct = ((clampedEnd - clampedStart) / daySpan) * 100;
          const isPast = evEnd < nowH;
          const isActive = evStart <= nowH && evEnd > nowH;
          const cat = CATEGORY_CONFIG[ev.category] ?? CATEGORY_CONFIG.general;
          const pri = PRIORITY_CONFIG[ev.priority] ?? PRIORITY_CONFIG.normal;
          const durMins = Math.round((evEnd - evStart) * 60);
          const durLabel = durMins >= 60 ? `${Math.floor(durMins / 60)}h${durMins % 60 > 0 ? ` ${durMins % 60}m` : ''}` : `${durMins}m`;
          const isShort = heightPct < 8; // less than ~38min on 8h day

          return (
            <div key={ev.id}
              className={`absolute left-1 right-1 rounded-xl overflow-hidden transition-all z-10 ${isActive ? 'ring-1' : ''}`}
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`,
                minHeight: '28px',
                backgroundColor: ev.color + (isActive ? '28' : '18'),
                borderLeft: `3px solid ${ev.color}${isPast ? '60' : ''}`,
                boxShadow: isActive ? `0 0 20px ${ev.color}30` : undefined,
                opacity: isPast ? 0.45 : 1,
                ...(isActive ? { '--tw-ring-color': ev.color + '70' } as React.CSSProperties : {}),
              }}>
              <div className={`flex items-start gap-2 px-2 ${isShort ? 'py-0.5' : 'py-2'} h-full`}>
                {/* Color dot */}
                <div className="flex-shrink-0 mt-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: ev.color }} />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-black truncate ${isShort ? 'text-xs' : isActive ? 'text-base' : 'text-sm'}`} style={{ color: theme.textPrimary }}>
                      {ev.title}
                    </span>
                    {isActive && !isShort && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full animate-pulse"
                        style={{ backgroundColor: ev.color + '30', color: ev.color }}>Live</span>
                    )}
                  </div>
                  {!isShort && (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold" style={{ color: theme.textMuted }}>
                        {formatTime12(ev.start_time)} – {formatTime12(ev.end_time)}
                      </span>
                      <span className="text-[10px] font-bold px-1 py-0.5 rounded"
                        style={{ backgroundColor: cat.color + '20', color: cat.color }}>{cat.label}</span>
                      <span className="text-[10px] font-bold" style={{ color: pri.color }}>{pri.icon} {durLabel}</span>
                    </div>
                  )}
                  {/* Active progress bar inside block */}
                  {isActive && !isShort && (
                    <div className="mt-1.5 w-full bg-white/10 rounded-full h-1">
                      <div className="h-1 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((nowH - evStart) / (evEnd - evStart)) * 100)}%`, backgroundColor: ev.color }} />
                    </div>
                  )}
                  {ev.notes && !isShort && heightPct > 15 && (
                    <div className="text-[10px] mt-1 truncate" style={{ color: theme.textMuted }}>{ev.notes}</div>
                  )}
                </div>
                {/* Duration badge — far right for non-short */}
                {!isShort && (
                  <div className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full self-start"
                    style={{ backgroundColor: ev.color + '25', color: ev.color }}>{durLabel}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KPI strip at bottom ──────────────────────────────────────────────────────
function KpiStrip({ kpis }: { kpis: KpiItem[] }) {
  if (!kpis.length) return null;
  return (
    <div className="flex gap-3 overflow-hidden">
      {kpis.slice(0, 5).map(item => {
        const pct = item.target > 0 ? Math.min(100, (item.value / item.target) * 100) : 0;
        return (
          <div key={item.id} className="flex-1 rounded-xl p-3 min-w-0"
            style={{ backgroundColor: item.color + '10', border: `1px solid ${item.color}25` }}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1 truncate" style={{ color: item.color }}>{item.title}</div>
            {item.type === 'progress' && (
              <>
                <div className="text-lg font-black text-white tabular-nums">{item.value.toLocaleString()}<span className="text-xs text-gray-400 ml-1">{item.unit}</span></div>
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                </div>
              </>
            )}
            {item.type === 'number' && (
              <div className="text-lg font-black text-white tabular-nums">{item.value.toLocaleString()}<span className="text-xs text-gray-400 ml-1">{item.unit}</span></div>
            )}
            {item.type === 'countdown' && (
              <div className="text-lg font-black tabular-nums" style={{ color: item.color }}>{Math.max(0, item.target - item.value).toLocaleString()}<span className="text-xs text-gray-400 ml-1">{item.unit}</span></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Weather types ────────────────────────────────────────────────────────────
interface WeatherData {
  city: string; country: string; temp: number; description: string; icon: string; units: string;
}

// ─── OWM icon → emoji map ─────────────────────────────────────────────────────
function weatherEmoji(icon: string): string {
  const code = icon.replace('n', 'd');
  const map: Record<string, string> = {
    '01d': '☀️', '02d': '🌤️', '03d': '🌥️', '04d': '☁️',
    '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
  };
  return map[code] ?? '🌡️';
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export default function DayWidget() {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [now, setNow] = useState(new Date());
  const [workStart, setWorkStart] = useState(8);
  const [workEnd, setWorkEnd] = useState(17);
  const [theme, setTheme] = useState<DayTheme>(DEFAULT_THEME);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const load = useCallback(() => {
    fetch(`/api/planner?today=1`).then(r => r.json()).then(d => {
      setEvents(d as PlannerEvent[]);
    }).catch(() => {});
    fetch('/api/kpi').then(r => r.json()).then(setKpis).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      if (s.work_start) {
        const [h, m] = s.work_start.split(':').map(Number);
        setWorkStart(h + m / 60);
      }
      if (s.work_end) {
        const [h, m] = s.work_end.split(':').map(Number);
        setWorkEnd(h + m / 60);
      }
      setTheme(getTheme(s.display_theme ?? 'midnight', s.display_theme_custom));
    }).catch(() => {});
    fetch('/api/weather').then(r => r.json()).then(d => {
      if (!d.error) setWeather(d as WeatherData);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const dataTimer = setInterval(load, 30000);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(dataTimer); clearInterval(clockTimer); };
  }, [load]);

  const nowH = now.getHours() + now.getMinutes() / 60;
  const sorted = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const activeCount = sorted.filter(e => parseTime(e.start_time) <= nowH && parseTime(e.end_time) > nowH).length;
  const doneCount = sorted.filter(e => e.completed || parseTime(e.end_time) <= nowH).length;

  const dateLabel = `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: theme.bgGradient, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 pt-6 pb-4 flex items-start justify-between border-b" style={{ borderColor: theme.headerBorder }}>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.4em] mb-1" style={{ color: theme.accent }}>Daily Operations</div>
          <div className="text-4xl font-black leading-none" style={{ color: theme.textPrimary }}>{dateLabel}</div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
              <span className="text-sm font-bold" style={{ color: theme.textMuted }}>{sorted.length} events</span>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse bg-green-400" />
                <span className="text-sm font-bold text-green-400">{activeCount} active now</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.textMuted }} />
              <span className="text-sm font-bold" style={{ color: theme.textMuted }}>{doneCount} completed</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <LiveClock theme={theme} />
          {weather && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: theme.accent + '15', border: `1px solid ${theme.accent}30` }}>
              <span className="text-2xl leading-none">{weatherEmoji(weather.icon)}</span>
              <div className="text-right">
                <div className="text-xl font-black tabular-nums leading-none" style={{ color: theme.textPrimary }}>
                  {weather.temp}°{weather.units === 'imperial' ? 'F' : weather.units === 'metric' ? 'C' : 'K'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider capitalize" style={{ color: theme.textMuted }}>
                  {weather.description} · {weather.city}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Day progress bar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 py-3 border-b" style={{ borderColor: theme.headerBorder }}>
        <DayProgress nowH={nowH} startH={workStart} endH={workEnd} theme={theme} />
      </div>

      {/* ── Timeline ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden px-4 py-3">
        {sorted.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-8xl">📋</div>
            <div className="text-2xl font-black uppercase tracking-widest" style={{ color: theme.textMuted }}>Nothing scheduled today</div>
            <div className="text-sm" style={{ color: theme.textMuted }}>Add events in the Weekly Planner</div>
          </div>
        ) : (
          <div className="h-full">
            <TimelineView
              events={sorted}
              nowH={nowH}
              workStart={workStart}
              workEnd={workEnd}
              theme={theme}
            />
          </div>
        )}
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
      {kpis.length > 0 && (
        <div className="flex-shrink-0 px-8 pb-4 pt-2 border-t" style={{ borderColor: theme.headerBorder }}>
          <KpiStrip kpis={kpis} />
        </div>
      )}
    </div>
  );
}
