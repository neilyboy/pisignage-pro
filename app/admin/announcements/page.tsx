'use client';
import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, X, Send } from 'lucide-react';
import type { Announcement, Device } from '@/lib/types';

const DEFAULT_FORM = { text: '', color: '#ffffff', bg_color: '#1a1a2e', speed: 50, device_ids: [] as string[], active: true, expires_at: '' };

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const load = () => {
    Promise.all([
      fetch('/api/announcements').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([a, d]) => { setAnnouncements(a); setDevices(d.filter((x: Device) => x.status !== 'pending')); });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    await fetch('/api/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, expires_at: form.expires_at ? new Date(form.expires_at).getTime() / 1000 : null }),
    });
    setShowModal(false);
    setForm(DEFAULT_FORM);
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

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Scrolling ticker overlays pushed to devices in real-time</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
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
          {announcements.map(ann => (
            <div key={ann.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              {/* Preview bar */}
              <div className="px-4 py-2 overflow-hidden" style={{ backgroundColor: ann.bg_color }}>
                <div className="text-sm font-medium truncate" style={{ color: ann.color }}>{ann.text}</div>
              </div>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white truncate">{ann.text}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Speed: {ann.speed} · {ann.device_ids.length === 0 ? 'All devices' : `${ann.device_ids.length} device(s)`}
                  </div>
                </div>
                <button onClick={() => toggleActive(ann)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${ann.active ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25' : 'bg-gray-500/15 text-gray-400 hover:bg-gray-500/25'}`}>
                  {ann.active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => deleteAnn(ann.id)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Announcement</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" /></button>
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
                <span className="text-sm text-white">Push immediately when created</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={!form.text}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                <Send className="w-4 h-4" /> Send Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
