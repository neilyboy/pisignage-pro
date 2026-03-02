'use client';
import { useEffect, useState, useCallback } from 'react';
import type { JobCard } from '@/lib/types';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];

function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekLabel(ws: Date): string {
  const we = new Date(ws); we.setDate(we.getDate() + 6);
  return `Week of ${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

const BLANK: Omit<JobCard, 'id' | 'created_at' | 'updated_at' | 'position'> = {
  week_start: '', day: 'Monday', job_name: '', location: '', description: '', techs: [], color: '#3b82f6',
};

export default function WeekGlancePage() {
  const [cards, setCards] = useState<JobCard[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getSundayOfWeek(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [techInput, setTechInput] = useState('');

  const weekStr = formatDate(weekStart);

  const load = useCallback(() => {
    fetch(`/api/job-cards?week=${weekStr}`).then(r => r.json()).then(setCards).catch(() => {});
  }, [weekStr]);

  useEffect(() => { load(); }, [load]);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const thisWeek = () => setWeekStart(getSundayOfWeek(new Date()));

  const openNew = () => {
    setEditId(null);
    setForm({ ...BLANK, week_start: weekStr });
    setTechInput('');
    setShowModal(true);
  };

  const openEdit = (card: JobCard) => {
    setEditId(card.id);
    setForm({ week_start: card.week_start, day: card.day, job_name: card.job_name, location: card.location, description: card.description, techs: card.techs, color: card.color });
    setTechInput('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.job_name.trim()) return;
    const body = { ...form, week_start: weekStr };
    if (editId) {
      await fetch(`/api/job-cards/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/job-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setShowModal(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this job card?')) return;
    await fetch(`/api/job-cards/${id}`, { method: 'DELETE' });
    load();
  };

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.techs.includes(t)) setForm(f => ({ ...f, techs: [...f.techs, t] }));
    setTechInput('');
  };

  const removeTech = (t: string) => setForm(f => ({ ...f, techs: f.techs.filter(x => x !== t) }));

  const cardsByDay = DAYS.reduce<Record<string, JobCard[]>>((acc, d) => {
    acc[d] = cards.filter(c => c.day === d);
    return acc;
  }, {});

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Week at a Glance</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Schedule job cards by day — displays on the Week Glance screen.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Job Card
        </button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3">
        <button onClick={prevWeek} className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white text-sm transition-colors">← Prev</button>
        <button onClick={thisWeek} className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white text-sm transition-colors">Today</button>
        <button onClick={nextWeek} className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white text-sm transition-colors">Next →</button>
        <span className="text-white font-semibold ml-2">{weekLabel(weekStart)}</span>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map((date, i) => {
          const dayName = DAYS[i];
          const isToday = formatDate(date) === formatDate(new Date());
          const dayCards = cardsByDay[dayName] ?? [];
          return (
            <div key={dayName} className={`rounded-xl overflow-hidden border ${isToday ? 'border-blue-500/60' : 'border-[hsl(var(--border))]'}`}>
              <div className={`px-3 py-2 text-xs font-black uppercase tracking-widest flex justify-between items-center ${isToday ? 'bg-blue-600/20 text-blue-400' : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'}`}>
                <span>{dayName.slice(0, 3)}</span>
                <span className="font-normal opacity-70">{date.getMonth() + 1}/{date.getDate()}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px] bg-[hsl(var(--card))]/50">
                {dayCards.length === 0 && (
                  <div className="text-[10px] text-center text-[hsl(var(--muted-foreground))] pt-4 opacity-50 uppercase tracking-widest">No jobs</div>
                )}
                {dayCards.map(card => (
                  <div key={card.id} className="rounded-lg p-2 text-xs group relative cursor-pointer hover:ring-1 transition-all"
                    style={{ backgroundColor: card.color + '20', borderLeft: `3px solid ${card.color}` }}
                    onClick={() => openEdit(card)}>
                    <div className="font-bold text-white truncate">{card.job_name}</div>
                    {card.location && <div className="text-[10px] opacity-70 truncate mt-0.5" style={{ color: card.color }}>📍 {card.location}</div>}
                    {card.description && <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">{card.description}</div>}
                    {card.techs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {card.techs.map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: card.color + '30', color: card.color }}>{t}</span>
                        ))}
                      </div>
                    )}
                    <button onClick={e => { e.stopPropagation(); del(card.id); }}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-[10px] leading-none px-1 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-all">✕</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-black text-white">{editId ? 'Edit Job Card' : 'Add Job Card'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 col-span-2 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Job Name *</span>
                <input value={form.job_name} onChange={e => setForm(f => ({ ...f, job_name: e.target.value }))} placeholder="e.g. Smith Residence AV Install"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Day</span>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>

              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Color</span>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </label>

              <label className="space-y-1.5 col-span-2 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Location</span>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. 123 Main St, Peoria"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
              </label>

              <label className="space-y-1.5 col-span-2 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Description / Work to be done</span>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  placeholder="e.g. Install 4 cameras, run cable, configure NVR..."
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </label>

              <div className="space-y-1.5 col-span-2">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Techs Going</span>
                <div className="flex gap-2">
                  <input value={techInput} onChange={e => setTechInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                    placeholder="Enter name, press Enter"
                    className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                  <button onClick={addTech} className="px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:text-white rounded-lg text-sm transition-colors">Add</button>
                </div>
                {form.techs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.techs.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: form.color + '25', color: form.color }}>
                        {t}
                        <button onClick={() => removeTech(t)} className="opacity-60 hover:opacity-100 leading-none">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={!form.job_name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                {editId ? 'Save Changes' : 'Add Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
