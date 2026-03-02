'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Trash2,
  Flag, Clock, Tag, FileText, CalendarDays, BarChart2,
  TrendingUp, Target, Hash, Edit2, Monitor, Copy
} from 'lucide-react';
import type { PlannerEvent, KpiItem } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64; // px per hour

const CATEGORIES = [
  { value: 'general', label: 'General', color: '#6b7280' },
  { value: 'job', label: 'Job / Project', color: '#3b82f6' },
  { value: 'meeting', label: 'Meeting', color: '#8b5cf6' },
  { value: 'deadline', label: 'Deadline', color: '#ef4444' },
  { value: 'travel', label: 'Travel', color: '#f59e0b' },
  { value: 'admin', label: 'Admin', color: '#10b981' },
  { value: 'personal', label: 'Personal', color: '#ec4899' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#6b7280', icon: '▽' },
  { value: 'normal', label: 'Normal', color: '#3b82f6', icon: '◇' },
  { value: 'high', label: 'High', color: '#f59e0b', icon: '△' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444', icon: '▲' },
];

const KPI_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function snapToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

function eventTop(event: PlannerEvent): number {
  return parseTime(event.start_time) * HOUR_HEIGHT;
}

function eventHeight(event: PlannerEvent): number {
  const dur = parseTime(event.end_time) - parseTime(event.start_time);
  return Math.max(dur * HOUR_HEIGHT, HOUR_HEIGHT * 0.25);
}

function getPriorityInfo(p: string) {
  return PRIORITIES.find(x => x.value === p) ?? PRIORITIES[1];
}

// ─── Default form ─────────────────────────────────────────────────────────────
const DEFAULT_EVENT_FORM = {
  title: '', notes: '', date: '', start_time: '09:00', end_time: '10:00',
  color: '#3b82f6', category: 'general', priority: 'normal', completed: false,
};

const DEFAULT_KPI_FORM = {
  title: '', type: 'progress' as KpiItem['type'], value: 0, target: 100,
  unit: '%', color: '#3b82f6', notes: '', data: [] as Array<{ label: string; value: number }>,
};

// ─── KPI Chart mini bar ───────────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: Array<{ label: string; value: number }>; color: string }) {
  if (!data.length) return <div className="text-xs text-gray-500 italic">No data points</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-12 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
          <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 44}px`, backgroundColor: color, opacity: 0.85 }} />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ item, onEdit, onDelete }: { item: KpiItem; onEdit: () => void; onDelete: () => void }) {
  const pct = item.target > 0 ? Math.min(100, (item.value / item.target) * 100) : 0;
  const priorityRing = pct >= 100 ? 'border-green-500/40' : pct >= 70 ? 'border-blue-500/30' : pct >= 40 ? 'border-yellow-500/30' : 'border-red-500/30';

  return (
    <div className={`bg-[hsl(var(--card))] border rounded-xl p-4 group relative ${priorityRing}`} style={{ borderColor: item.color + '40' }}>
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 bg-black/40 hover:bg-blue-600 text-white rounded-lg"><Edit2 className="w-3 h-3" /></button>
        <button onClick={onDelete} className="p-1 bg-black/40 hover:bg-red-600 text-white rounded-lg"><Trash2 className="w-3 h-3" /></button>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color + '20' }}>
          {item.type === 'progress' && <Target className="w-5 h-5" style={{ color: item.color }} />}
          {item.type === 'number' && <Hash className="w-5 h-5" style={{ color: item.color }} />}
          {item.type === 'countdown' && <Clock className="w-5 h-5" style={{ color: item.color }} />}
          {item.type === 'chart' && <BarChart2 className="w-5 h-5" style={{ color: item.color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{item.title}</div>
          {item.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</div>}
        </div>
      </div>

      {item.type === 'progress' && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-2xl font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-1">{item.unit}</span></span>
            <span className="text-sm font-medium text-gray-300">{Math.round(pct)}%</span>
          </div>
          <div className="w-full bg-[hsl(var(--secondary))] rounded-full h-2.5">
            <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.color }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">Target: {item.target.toLocaleString()} {item.unit}</div>
        </div>
      )}

      {item.type === 'number' && (
        <div className="mt-3">
          <span className="text-3xl font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}</span>
          <span className="text-sm text-gray-400 ml-2">{item.unit}</span>
          {item.target > 0 && <div className="text-xs text-gray-500 mt-1">vs target {item.target.toLocaleString()}</div>}
        </div>
      )}

      {item.type === 'countdown' && (
        <div className="mt-3">
          <span className="text-3xl font-bold" style={{ color: item.color }}>{Math.max(0, item.target - item.value).toLocaleString()}</span>
          <span className="text-sm text-gray-400 ml-2">{item.unit} remaining</span>
          <div className="text-xs text-gray-500 mt-1">{item.value.toLocaleString()} of {item.target.toLocaleString()} used</div>
        </div>
      )}

      {item.type === 'chart' && (
        <MiniBarChart data={item.data} color={item.color} />
      )}
    </div>
  );
}

// ─── Event Block ──────────────────────────────────────────────────────────────
function EventBlock({ event, onClick }: { event: PlannerEvent; onClick: (e: React.MouseEvent) => void }) {
  const top = eventTop(event);
  const height = eventHeight(event);
  const pri = getPriorityInfo(event.priority);
  const isShort = height < 40;

  return (
    <div
      onClick={onClick}
      className="absolute left-0.5 right-0.5 rounded-md cursor-pointer overflow-hidden group select-none z-10 transition-all hover:z-20 hover:shadow-lg hover:brightness-110"
      style={{ top: `${top}px`, height: `${height}px`, backgroundColor: event.color + (event.completed ? '50' : 'dd'), borderLeft: `3px solid ${event.color}` }}
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-start overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          {event.completed && <Check className="w-2.5 h-2.5 text-white flex-shrink-0" />}
          <span className="text-white text-xs font-semibold truncate leading-tight" style={{ textDecoration: event.completed ? 'line-through' : 'none', opacity: event.completed ? 0.7 : 1 }}>{event.title}</span>
        </div>
        {!isShort && (
          <div className="text-white/70 text-[10px] leading-tight mt-0.5">
            {event.start_time}–{event.end_time}
          </div>
        )}
        {!isShort && event.notes && (
          <div className="text-white/60 text-[10px] truncate mt-0.5">{event.notes}</div>
        )}
      </div>
      <div className="absolute top-0.5 right-1 opacity-0 group-hover:opacity-100 text-[10px]" style={{ color: pri.color }}>{pri.icon}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getSundayOfWeek(new Date()));
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [tab, setTab] = useState<'planner' | 'kpi'>('planner');
  const [loading, setLoading] = useState(true);

  // Event modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ ...DEFAULT_EVENT_FORM });
  const [editEventId, setEditEventId] = useState<string | null>(null);

  // KPI modal
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [kpiForm, setKpiForm] = useState({ ...DEFAULT_KPI_FORM });
  const [editKpiId, setEditKpiId] = useState<string | null>(null);
  const [kpiDataInput, setKpiDataInput] = useState('');

  const gridRef = useRef<HTMLDivElement>(null);

  // ── Week dates ──────────────────────────────────────────────────────────────
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekParam = formatDate(weekStart);

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadEvents = useCallback(() => {
    return fetch(`/api/planner?week=${weekParam}`)
      .then(r => r.json())
      .then(d => setEvents(d));
  }, [weekParam]);

  const loadKpis = useCallback(() => {
    return fetch('/api/kpi').then(r => r.json()).then(d => setKpis(d));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadEvents(), loadKpis()]).finally(() => setLoading(false));
  }, [loadEvents, loadKpis]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(getSundayOfWeek(d)); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(getSundayOfWeek(d)); };
  const goToday = () => setWeekStart(getSundayOfWeek(new Date()));

  const weekLabel = (() => {
    const end = weekDates[6];
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (weekStart.getFullYear() !== end.getFullYear())
      return `${weekStart.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
    if (weekStart.getMonth() !== end.getMonth())
      return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`;
    return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  })();

  // ── Click on grid to create event ──────────────────────────────────────────
  const handleGridClick = (dateStr: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const rawHour = y / HOUR_HEIGHT;
    const snapped = snapToQuarter(rawHour);
    const start = Math.max(0, Math.min(23.75, snapped));
    const end = Math.min(24, start + 1);
    setEditEventId(null);
    setEventForm({ ...DEFAULT_EVENT_FORM, date: dateStr, start_time: formatTime(start), end_time: formatTime(end) });
    setShowEventModal(true);
  };

  // ── Event CRUD ──────────────────────────────────────────────────────────────
  const openEditEvent = (ev: PlannerEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditEventId(ev.id);
    setEventForm({
      title: ev.title, notes: ev.notes ?? '', date: ev.date,
      start_time: ev.start_time, end_time: ev.end_time,
      color: ev.color, category: ev.category, priority: ev.priority, completed: ev.completed,
    });
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim()) return;
    if (editEventId) {
      await fetch(`/api/planner/${editEventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventForm) });
    } else {
      await fetch('/api/planner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventForm) });
    }
    setShowEventModal(false);
    await loadEvents();
  };

  const deleteEvent = async (id: string) => {
    await fetch(`/api/planner/${id}`, { method: 'DELETE' });
    setShowEventModal(false);
    await loadEvents();
  };

  // ── KPI CRUD ─────────────────────────────────────────────────────────────────
  const openAddKpi = () => {
    setEditKpiId(null);
    setKpiForm({ ...DEFAULT_KPI_FORM });
    setKpiDataInput('');
    setShowKpiModal(true);
  };

  const openEditKpi = (item: KpiItem) => {
    setEditKpiId(item.id);
    setKpiForm({ title: item.title, type: item.type, value: item.value, target: item.target, unit: item.unit, color: item.color, notes: item.notes ?? '', data: item.data });
    setKpiDataInput(item.data.map(d => `${d.label}:${d.value}`).join(', '));
    setShowKpiModal(true);
  };

  const saveKpi = async () => {
    if (!kpiForm.title.trim()) return;
    const parsedData = kpiDataInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const [label, val] = s.split(':');
        return { label: label?.trim() ?? s, value: parseFloat(val) || 0 };
      });
    const body = { ...kpiForm, data: parsedData };
    if (editKpiId) {
      await fetch(`/api/kpi/${editKpiId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/kpi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setShowKpiModal(false);
    await loadKpis();
  };

  const deleteKpi = async (id: string) => {
    if (!confirm('Delete this KPI?')) return;
    await fetch(`/api/kpi/${id}`, { method: 'DELETE' });
    await loadKpis();
  };

  // ── Today ────────────────────────────────────────────────────────────────────
  const todayStr = formatDate(new Date());
  const now = new Date();
  const nowHours = now.getHours() + now.getMinutes() / 60;

  // Events by date
  const eventsByDate = (dateStr: string) => events.filter(e => e.date === dateStr);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Weekly Planner</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {/* Display URL button */}
          <div className="flex items-center gap-1">
            <a href="/display-planner" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 border border-[hsl(var(--border))] hover:border-green-500 text-[hsl(var(--muted-foreground))] hover:text-green-400 px-3 py-1.5 rounded-lg text-sm transition-colors">
              <Monitor className="w-4 h-4" /> Preview
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.origin + '/display-planner'); }}
              title="Copy display URL to clipboard"
              className="flex items-center gap-1.5 border border-[hsl(var(--border))] hover:border-blue-500 text-[hsl(var(--muted-foreground))] hover:text-blue-400 px-2 py-1.5 rounded-lg text-sm transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {/* Tab switcher */}
          <div className="flex bg-[hsl(var(--secondary))] rounded-lg p-0.5 gap-0.5">
            <button onClick={() => setTab('planner')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'planner' ? 'bg-blue-600 text-white' : 'text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
              <CalendarDays className="w-3.5 h-3.5" /> Schedule
            </button>
            <button onClick={() => setTab('kpi')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'kpi' ? 'bg-blue-600 text-white' : 'text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
              <TrendingUp className="w-3.5 h-3.5" /> KPI Board
            </button>
          </div>

          {tab === 'planner' && (
            <>
              <button onClick={prevWeek} className="p-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-blue-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={goToday} className="px-3 py-1.5 text-sm border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white hover:border-blue-500 transition-colors">Today</button>
              <button onClick={nextWeek} className="p-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-blue-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              <button
                onClick={() => { setEditEventId(null); setEventForm({ ...DEFAULT_EVENT_FORM, date: todayStr }); setShowEventModal(true); }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Event
              </button>
            </>
          )}
          {tab === 'kpi' && (
            <button onClick={openAddKpi} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> Add KPI
            </button>
          )}
        </div>
      </div>

      {/* ── PLANNER TAB ─────────────────────────────────────────────────────── */}
      {tab === 'planner' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Day header row */}
          <div className="flex-shrink-0 flex border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="w-16 flex-shrink-0" /> {/* gutter */}
            {weekDates.map((date, i) => {
              const ds = formatDate(date);
              const isToday = ds === todayStr;
              const dayEvents = eventsByDate(ds);
              const completed = dayEvents.filter(e => e.completed).length;
              return (
                <div key={i} className={`flex-1 px-2 py-2 text-center border-l border-[hsl(var(--border))] ${isToday ? 'bg-blue-600/10' : ''}`}>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{DAYS_SHORT[date.getDay()]}</div>
                  <div className={`text-lg font-bold mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-blue-600 text-white' : 'text-white'}`}>
                    {date.getDate()}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      {completed}/{dayEvents.length} done
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scrollable grid */}
          <div className="flex-1 overflow-y-auto" ref={gridRef}>
            <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
              {/* Hour gutter */}
              <div className="w-16 flex-shrink-0 relative">
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full" style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] pr-2 block text-right leading-none -mt-2">{formatHour(h)}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDates.map((date, colIdx) => {
                const ds = formatDate(date);
                const isToday = ds === todayStr;
                const dayEvs = eventsByDate(ds);
                return (
                  <div
                    key={colIdx}
                    className={`flex-1 relative border-l border-[hsl(var(--border))] cursor-crosshair ${isToday ? 'bg-blue-600/5' : ''}`}
                    style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
                    onClick={e => { if ((e.target as HTMLElement).closest('[data-event]')) return; handleGridClick(ds, e); }}
                  >
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <div key={h} className="absolute w-full border-t border-[hsl(var(--border))]/40" style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                        <div className="absolute w-full border-t border-[hsl(var(--border))]/20" style={{ top: `${HOUR_HEIGHT / 2}px` }} />
                      </div>
                    ))}

                    {/* Now line */}
                    {isToday && (
                      <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${nowHours * HOUR_HEIGHT}px` }}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 flex-shrink-0" />
                          <div className="flex-1 h-px bg-red-400" />
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    {dayEvs.map(ev => (
                      <div key={ev.id} data-event="1">
                        <EventBlock event={ev} onClick={e => openEditEvent(ev, e)} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI TAB ──────────────────────────────────────────────────────────── */}
      {tab === 'kpi' && (
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">Loading…</div>
          ) : kpis.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[hsl(var(--border))] rounded-xl">
              <TrendingUp className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
              <p className="text-white font-medium">No KPIs yet</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Track job progress, targets, and metrics</p>
              <button onClick={openAddKpi} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">Add First KPI</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {kpis.map(item => (
                <KpiCard key={item.id} item={item} onEdit={() => openEditKpi(item)} onDelete={() => deleteKpi(item.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EVENT MODAL ────────────────────────────────────────────────────── */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowEventModal(false)}>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editEventId ? 'Edit Event' : 'New Event'}</h3>
              <div className="flex items-center gap-2">
                {editEventId && (
                  <button onClick={() => deleteEvent(editEventId)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setShowEventModal(false)} className="text-[hsl(var(--muted-foreground))] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <input
                autoFocus
                placeholder="Event title *"
                value={eventForm.title}
                onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveEvent()}
                className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2.5 rounded-lg text-sm outline-none font-medium placeholder-gray-500"
              />

              {/* Date + times */}
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Date</span>
                  <input type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Start</span>
                  <input type="time" value={eventForm.start_time} onChange={e => setEventForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">End</span>
                  <input type="time" value={eventForm.end_time} onChange={e => setEventForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none" />
                </label>
              </div>

              {/* Category + Priority */}
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><Tag className="w-3 h-3" /> Category</span>
                  <select value={eventForm.category} onChange={e => {
                    const cat = CATEGORIES.find(c => c.value === e.target.value);
                    setEventForm(f => ({ ...f, category: e.target.value, color: cat?.color ?? f.color }));
                  }} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><Flag className="w-3 h-3" /> Priority</span>
                  <select value={eventForm.priority} onChange={e => setEventForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
                  </select>
                </label>
              </div>

              {/* Color swatches */}
              <div className="space-y-1">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Color</span>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setEventForm(f => ({ ...f, color: c.color }))}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${eventForm.color === c.color ? 'ring-2 ring-white ring-offset-1 ring-offset-[hsl(var(--card))] scale-110' : ''}`}
                      style={{ backgroundColor: c.color }} />
                  ))}
                  <input type="color" value={eventForm.color} onChange={e => setEventForm(f => ({ ...f, color: e.target.value }))}
                    className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent" title="Custom color" />
                </div>
              </div>

              {/* Notes */}
              <label className="space-y-1 block">
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><FileText className="w-3 h-3" /> Notes</span>
                <textarea value={eventForm.notes} onChange={e => setEventForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes…"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </label>

              {/* Completed */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setEventForm(f => ({ ...f, completed: !f.completed }))}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${eventForm.completed ? 'bg-green-600' : 'bg-[hsl(var(--secondary))]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${eventForm.completed ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-white">Mark as completed</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowEventModal(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={saveEvent} disabled={!eventForm.title.trim() || !eventForm.date}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                {editEventId ? 'Save Changes' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI MODAL ──────────────────────────────────────────────────────── */}
      {showKpiModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowKpiModal(false)}>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editKpiId ? 'Edit KPI' : 'New KPI'}</h3>
              <button onClick={() => setShowKpiModal(false)} className="text-[hsl(var(--muted-foreground))] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input autoFocus placeholder="Title *" value={kpiForm.title} onChange={e => setKpiForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2.5 rounded-lg text-sm outline-none font-medium" />

              {/* Type */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['progress', 'number', 'countdown', 'chart'] as const).map(t => (
                  <button key={t} onClick={() => setKpiForm(f => ({ ...f, type: t }))}
                    className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors flex flex-col items-center gap-1 ${kpiForm.type === t ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
                    {t === 'progress' && <Target className="w-4 h-4" />}
                    {t === 'number' && <Hash className="w-4 h-4" />}
                    {t === 'countdown' && <Clock className="w-4 h-4" />}
                    {t === 'chart' && <BarChart2 className="w-4 h-4" />}
                    {t}
                  </button>
                ))}
              </div>

              {/* Value / Target / Unit */}
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Current</span>
                  <input type="number" value={kpiForm.value} onChange={e => setKpiForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Target</span>
                  <input type="number" value={kpiForm.target} onChange={e => setKpiForm(f => ({ ...f, target: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Unit</span>
                  <input value={kpiForm.unit} onChange={e => setKpiForm(f => ({ ...f, unit: e.target.value }))} placeholder="%, hrs, $…"
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none" />
                </label>
              </div>

              {/* Chart data */}
              {kpiForm.type === 'chart' && (
                <label className="space-y-1 block">
                  <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><BarChart2 className="w-3 h-3" /> Data Points <span className="text-gray-500">(label:value, label:value)</span></span>
                  <input value={kpiDataInput} onChange={e => setKpiDataInput(e.target.value)} placeholder="Mon:42, Tue:67, Wed:55, Thu:80, Fri:91"
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </label>
              )}

              {/* Color */}
              <div className="space-y-1">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Color</span>
                <div className="flex gap-2 flex-wrap">
                  {KPI_COLORS.map(c => (
                    <button key={c} onClick={() => setKpiForm(f => ({ ...f, color: c }))}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${kpiForm.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[hsl(var(--card))] scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              {/* Notes */}
              <input value={kpiForm.notes} onChange={e => setKpiForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
                className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowKpiModal(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={saveKpi} disabled={!kpiForm.title.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                {editKpiId ? 'Save Changes' : 'Add KPI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
