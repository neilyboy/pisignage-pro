'use client';
import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, X, Send, Edit2, Clock, Calendar } from 'lucide-react';
import type { Announcement, Device } from '@/lib/types';

const DEFAULT_FORM = {
  text: '', color: '#ffffff', bg_color: '#1a1a2e', speed: 50,
  device_ids: [] as string[], active: true,
  start_at: '', expires_at: '',
};
type FormState = typeof DEFAULT_FORM;

function toLocalInput(unix: number | null | undefined): string {
  if (!unix) return '';
  const d = new Date(unix * 1000);
  // format as YYYY-MM-DDTHH:MM for datetime-local
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toUnix(s: string): number | null {
  if (!s) return null;
  return Math.floor(new Date(s).getTime() / 1000);
}

function scheduleLabel(ann: Announcement & { start_at?: number | null }): string | null {
  const now = Math.floor(Date.now() / 1000);
  if (ann.start_at && ann.start_at > now) {
    return `Starts ${new Date(ann.start_at * 1000).toLocaleString()}`;
  }
  if (ann.expires_at) {
    const exp = ann.expires_at * 1000;
    if (exp < Date.now()) return 'Expired';
    return `Expires ${new Date(exp).toLocaleString()}`;
  }
  return null;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<(Announcement & { start_at?: number | null })[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const load = () => {
    Promise.all([
      fetch('/api/announcements?all=1').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([a, d]) => {
      setAnnouncements(a);
      setDevices(d.filter((x: Device) => x.status !== 'pending'));
    });
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (ann: Announcement & { start_at?: number | null }) => {
    setEditingId(ann.id);
    setForm({
      text: ann.text,
      color: ann.color,
      bg_color: ann.bg_color,
      speed: ann.speed,
      device_ids: ann.device_ids ?? [],
      active: ann.active,
      start_at: toLocalInput(ann.start_at),
      expires_at: toLocalInput(ann.expires_at ?? null),
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(DEFAULT_FORM); };

  const save = async () => {
    const payload = {
      ...form,
      start_at: toUnix(form.start_at),
      expires_at: toUnix(form.expires_at),
    };
    if (editingId) {
      await fetch(`/api/announcements/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    closeModal();
    load();
  };

  const deleteAnn = async (id: string) => {
    if (!confirm('Delete announcement?')) return;
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleDevice = (id: string) => {
    setForm(f => ({ ...f, device_ids: f.device_ids.includes(id) ? f.device_ids.filter(x => x !== id) : [...f.device_ids, id] }));
  };

  const toggleActive = async (ann: Announcement) => {
    await fetch(`/api/announcements/${ann.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !ann.active }),
    });
    load();
  };

  const isScheduled = (ann: Announcement & { start_at?: number | null }) => {
    const now = Math.floor(Date.now() / 1000);
    return ann.start_at && ann.start_at > now;
  };

  const isExpired = (ann: Announcement) => ann.expires_at && ann.expires_at * 1000 < Date.now();

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Scrolling ticker overlays pushed to devices in real-time</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-16 text-center">
          <Bell className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))] font-medium">No announcements</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Create scrolling text overlays that appear on your devices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const sched = scheduleLabel(ann);
            const expired = isExpired(ann);
            const scheduled = isScheduled(ann);
            return (
              <div key={ann.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                {/* Preview bar */}
                <div className="px-4 py-2 overflow-hidden" style={{ backgroundColor: ann.bg_color }}>
                  <div className="text-sm font-medium truncate" style={{ color: ann.color }}>{ann.text}</div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{ann.text}</div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        Speed: {ann.speed} · {ann.device_ids.length === 0 ? 'All devices' : `${ann.device_ids.length} device(s)`}
                      </span>
                      {sched && (
                        <span className={`flex items-center gap-1 text-xs font-medium ${expired ? 'text-red-400' : scheduled ? 'text-yellow-400' : 'text-blue-400'}`}>
                          <Calendar className="w-3 h-3" />{sched}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => toggleActive(ann)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors flex-shrink-0 ${
                      expired ? 'bg-red-500/15 text-red-400' :
                      scheduled ? 'bg-yellow-500/15 text-yellow-400' :
                      ann.active ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25' : 'bg-gray-500/15 text-gray-400 hover:bg-gray-500/25'
                    }`}>
                    {expired ? 'Expired' : scheduled ? 'Scheduled' : ann.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => openEdit(ann)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors flex-shrink-0">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAnn(ann.id)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" /></button>
            </div>

            {/* Live preview */}
            <div className="rounded-lg overflow-hidden py-3 px-4" style={{ backgroundColor: form.bg_color }}>
              <div className="text-sm font-medium" style={{ color: form.color }}>{form.text || 'Preview text…'}</div>
            </div>

            <div className="space-y-3">
              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Announcement Text *</span>
                <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={2}
                  placeholder="Breaking news: Important announcement text here…"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Text Color</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                    <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none font-mono" />
                  </div>
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Background Color</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                    <input value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                      className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none font-mono" />
                  </div>
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Scroll Speed: {form.speed}</span>
                <input type="range" min={10} max={90} value={form.speed} onChange={e => setForm(f => ({ ...f, speed: Number(e.target.value) }))} className="w-full accent-blue-500" />
              </label>

              {/* Scheduling */}
              <div className="border border-[hsl(var(--border))] rounded-xl p-3 space-y-3 bg-[hsl(var(--secondary))/30]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                  <Clock className="w-3.5 h-3.5" /> Schedule (optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5 block">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Start At</span>
                    <input type="datetime-local" value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                      className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-xs outline-none" />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Expires At</span>
                    <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                      className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-xs outline-none" />
                  </label>
                </div>
                {form.start_at && <p className="text-xs text-yellow-400">⏰ Will be pushed to devices at the scheduled start time (on next 5-min check).</p>}
              </div>

              {devices.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Send to (empty = all devices)</span>
                  <div className="flex flex-wrap gap-2">
                    {devices.map(d => (
                      <button key={d.id} type="button" onClick={() => toggleDevice(d.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.device_ids.includes(d.id) ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--input))] text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-blue-600' : 'bg-[hsl(var(--secondary))]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-white">{form.start_at ? 'Active (push at scheduled time)' : 'Push immediately'}</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={closeModal} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={!form.text}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                {editingId ? <><Edit2 className="w-4 h-4" /> Save Changes</> : <><Send className="w-4 h-4" /> Send Announcement</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
