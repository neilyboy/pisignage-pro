'use client';
import { useEffect, useState } from 'react';
import { Calendar, Plus, Trash2, Clock, X } from 'lucide-react';
import type { Schedule, Playlist, Device } from '@/lib/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_FORM = {
  name: '', device_id: '', playlist_id: '', start_time: '08:00', end_time: '18:00',
  days: [1, 2, 3, 4, 5], recurrence: 'weekly', active: true, priority: 0,
};

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => {
    Promise.all([
      fetch('/api/schedules').then(r => r.json()),
      fetch('/api/playlists').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([s, p, d]) => { setSchedules(s); setPlaylists(p); setDevices(d.filter((x: Device) => x.status !== 'pending')); });
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditId(null); setForm(DEFAULT_FORM); setShowModal(true); };
  const openEdit = (s: Schedule) => {
    setEditId(s.id);
    setForm({ name: s.name, device_id: s.device_id ?? '', playlist_id: s.playlist_id, start_time: s.start_time, end_time: s.end_time, days: s.days, recurrence: s.recurrence, active: s.active, priority: s.priority });
    setShowModal(true);
  };

  const save = async () => {
    const body = { ...form, device_id: form.device_id || null };
    if (editId) {
      await fetch(`/api/schedules/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setShowModal(false);
    load();
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day].sort(),
    }));
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Control what plays when on each device</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-16 text-center">
          <Calendar className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))] font-medium">No schedules yet</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Create a schedule to control when playlists play on your devices.</p>
          <button onClick={openAdd} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">Create First Schedule</button>
        </div>
      ) : (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {['Name', 'Device', 'Playlist', 'Time', 'Days', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {schedules.map(s => {
                const device = devices.find(d => d.id === s.device_id);
                const playlist = playlists.find(p => p.id === s.playlist_id);
                return (
                  <tr key={s.id} className="hover:bg-[hsl(var(--secondary))/50] transition-colors cursor-pointer" onClick={() => openEdit(s)}>
                    <td className="px-4 py-3 text-sm font-medium text-white">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">{device?.name ?? 'All devices'}</td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">{playlist?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.start_time} – {s.end_time}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {DAYS.map((d, i) => (
                          <span key={d} className={`w-7 h-5 rounded text-xs flex items-center justify-center font-medium ${s.days.includes(i) ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'}`}>{d[0]}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); deleteSchedule(s.id); }} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editId ? 'Edit Schedule' : 'New Schedule'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[hsl(var(--muted-foreground))] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Schedule Name</span>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekday Morning"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Device</span>
                  <select value={form.device_id} onChange={e => setForm(f => ({ ...f, device_id: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
                    <option value="">All devices</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Playlist *</span>
                  <select value={form.playlist_id} onChange={e => setForm(f => ({ ...f, playlist_id: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
                    <option value="">— Select —</option>
                    {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Start Time</span>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">End Time</span>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </label>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Days</span>
                <div className="flex gap-1.5">
                  {DAYS.map((d, i) => (
                    <button key={d} type="button" onClick={() => toggleDay(i)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.days.includes(i) ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--input))] text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-blue-600' : 'bg-[hsl(var(--secondary))]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-white">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={!form.name || !form.playlist_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                {editId ? 'Save Changes' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
