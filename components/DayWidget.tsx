'use client';
import { useEffect, useState, useCallback } from 'react';
import type { PlannerEvent, KpiItem } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(date: Date): string {
  // Use local date, not UTC (toISOString always returns UTC which can be wrong day)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
function LiveClock() {
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
      <span className="text-6xl font-black text-white">{h12}:{m}</span>
      <span className="text-3xl font-black text-blue-400 ml-1">{ampm}</span>
      <span className="text-2xl text-gray-600 ml-2">{s}</span>
    </div>
  );
}

// ─── Progress bar for the day timeline ───────────────────────────────────────
function DayProgress({ nowH }: { nowH: number }) {
  const startH = 6;  // show from 6am
  const endH = 22;   // to 10pm
  const pct = Math.max(0, Math.min(100, ((nowH - startH) / (endH - startH)) * 100));
  const label = (() => {
    const remaining = endH - nowH;
    if (remaining <= 0) return 'End of day';
    const hrs = Math.floor(remaining);
    const mins = Math.round((remaining - hrs) * 60);
    return hrs > 0 ? `${hrs}h ${mins}m remaining in workday` : `${mins}m remaining`;
  })();

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
        <span>6 AM</span>
        <span className="text-blue-400">{label}</span>
        <span>10 PM</span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2 relative">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-60000"
          style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-lg shadow-blue-400/50"
          style={{ left: `calc(${pct}% - 6px)` }} />
      </div>
    </div>
  );
}

// ─── Single event row ─────────────────────────────────────────────────────────
function EventRow({ event, nowH, isNext }: { event: PlannerEvent; nowH: number; isNext: boolean }) {
  const startH = parseTime(event.start_time);
  const endH = parseTime(event.end_time);
  const isPast = endH < nowH;
  const isActive = startH <= nowH && endH > nowH;
  const cat = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.general;
  const pri = PRIORITY_CONFIG[event.priority] ?? PRIORITY_CONFIG.normal;
  const durMins = Math.round((endH - startH) * 60);
  const durLabel = durMins >= 60 ? `${Math.floor(durMins / 60)}h${durMins % 60 > 0 ? ` ${durMins % 60}m` : ''}` : `${durMins}m`;

  return (
    <div className={`relative flex items-stretch gap-4 rounded-2xl overflow-hidden transition-all ${
      isActive ? 'ring-2 shadow-2xl' : ''
    } ${isPast ? 'opacity-40' : ''}`}
      style={{
        backgroundColor: isActive ? event.color + '18' : 'rgba(255,255,255,0.03)',
        borderLeft: `4px solid ${isActive || isNext ? event.color : event.color + '60'}`,
        boxShadow: isActive ? `0 0 40px ${event.color}20` : undefined,
        ...(isActive ? { '--tw-ring-color': event.color + '60' } as React.CSSProperties : {}),
      }}>

      {/* Active pulse indicator */}
      {isActive && (
        <div className="absolute top-3 right-4 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: event.color }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: event.color }}>Live</span>
        </div>
      )}
      {isNext && !isActive && (
        <div className="absolute top-3 right-4">
          <span className="text-xs font-bold uppercase tracking-widest text-yellow-400">Up Next</span>
        </div>
      )}

      {/* Time column */}
      <div className="flex-shrink-0 w-28 flex flex-col items-center justify-center py-4 gap-0.5"
        style={{ backgroundColor: event.color + (isActive ? '20' : '10') }}>
        <span className="text-sm font-black text-white">{formatTime12(event.start_time)}</span>
        <span className="text-xs text-gray-500">↓</span>
        <span className="text-sm font-bold text-gray-400">{formatTime12(event.end_time)}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: event.color + '25', color: event.color }}>{durLabel}</span>
      </div>

      {/* Content */}
      <div className="flex-1 py-4 pr-4 min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cat.color + '20', color: cat.color }}>{cat.label}</span>
              <span className="text-xs font-bold" style={{ color: pri.color }}>{pri.icon} {pri.label}</span>
              {event.completed && (
                <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">✓ Done</span>
              )}
            </div>
            <div className={`font-black text-white leading-tight ${isActive ? 'text-2xl' : 'text-xl'}`}
              style={{ textDecoration: event.completed ? 'line-through' : 'none', opacity: event.completed ? 0.6 : 1 }}>
              {event.title}
            </div>
            {event.notes && (
              <div className="text-sm text-gray-400 mt-1.5 leading-snug">{event.notes}</div>
            )}
          </div>
        </div>

        {/* Active: show time elapsed bar */}
        {isActive && (
          <div className="mt-3">
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((nowH - startH) / (endH - startH)) * 100)}%`, backgroundColor: event.color }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round((nowH - startH) * 60)}m elapsed · {Math.round((endH - nowH) * 60)}m remaining
            </div>
          </div>
        )}
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

// ─── Main Widget ──────────────────────────────────────────────────────────────
export default function DayWidget() {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [now, setNow] = useState(new Date());

  const load = useCallback(() => {
    // Fetch all events and filter client-side to avoid timezone issues with week param
    fetch(`/api/planner`).then(r => r.json()).then(d => {
      const today = formatDate(new Date());
      setEvents((d as PlannerEvent[]).filter((e: PlannerEvent) => e.date === today));
    }).catch(() => {});
    fetch('/api/kpi').then(r => r.json()).then(setKpis).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const dataTimer = setInterval(load, 30000);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(dataTimer); clearInterval(clockTimer); };
  }, [load]);

  const nowH = now.getHours() + now.getMinutes() / 60;
  const sorted = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const upcoming = sorted.filter(e => parseTime(e.end_time) > nowH);
  const nextEventId = upcoming[0]?.id;
  const activeCount = sorted.filter(e => parseTime(e.start_time) <= nowH && parseTime(e.end_time) > nowH).length;
  const doneCount = sorted.filter(e => e.completed || parseTime(e.end_time) <= nowH).length;

  const dateLabel = `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #060b18 0%, #0a0f1e 60%, #060d14 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 pt-6 pb-4 flex items-start justify-between border-b" style={{ borderColor: '#1e2d4a' }}>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.4em] text-blue-400 mb-1">Daily Operations</div>
          <div className="text-4xl font-black text-white leading-none">{dateLabel}</div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-sm font-bold text-gray-400">{sorted.length} events</span>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-bold text-green-400">{activeCount} active now</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-sm font-bold text-gray-500">{doneCount} completed</span>
            </div>
          </div>
        </div>
        <LiveClock />
      </div>

      {/* ── Day progress bar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 py-3 border-b" style={{ borderColor: '#1e2d4a' }}>
        <DayProgress nowH={nowH} />
      </div>

      {/* ── Event list ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden px-8 py-4">
        {sorted.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-8xl">📋</div>
            <div className="text-2xl font-black text-gray-600 uppercase tracking-widest">Nothing scheduled today</div>
            <div className="text-gray-700 text-sm">Add events in the Weekly Planner</div>
          </div>
        ) : (
          <div className="h-full flex flex-col gap-3 overflow-hidden"
            style={{ maxHeight: '100%' }}>
            {sorted.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                nowH={nowH}
                isNext={ev.id === nextEventId && !sorted.some(e => parseTime(e.start_time) <= nowH && parseTime(e.end_time) > nowH)}
              />
            )).slice(0, 5)}
            {sorted.length > 5 && (
              <div className="text-center text-sm font-bold text-gray-600 uppercase tracking-widest py-2">
                +{sorted.length - 5} more events today
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
      {kpis.length > 0 && (
        <div className="flex-shrink-0 px-8 pb-4 pt-2 border-t" style={{ borderColor: '#1e2d4a' }}>
          <KpiStrip kpis={kpis} />
        </div>
      )}
    </div>
  );
}
