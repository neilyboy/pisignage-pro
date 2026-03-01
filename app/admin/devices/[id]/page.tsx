'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Save, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { timeAgo, isOnline } from '@/lib/utils';
import type { Device, Playlist } from '@/lib/types';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', notes: '', brightness: 100, orientation: 'landscape', playlist_id: '' });

  useEffect(() => {
    Promise.all([
      fetch(`/api/devices/${id}`).then(r => r.json()),
      fetch('/api/playlists').then(r => r.json()),
    ]).then(([d, p]) => {
      setDevice(d);
      setPlaylists(p);
      setForm({
        name: d.name ?? '',
        location: d.location ?? '',
        notes: d.notes ?? '',
        brightness: d.brightness ?? 100,
        orientation: d.orientation ?? 'landscape',
        playlist_id: d.current_playlist_id ?? '',
      });
    });
  }, [id]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/devices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
  };

  const pushPlaylist = async () => {
    if (!form.playlist_id) return;
    await fetch(`/api/devices/${id}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'playlist', playlist_id: form.playlist_id }),
    });
    alert('Playlist pushed to device!');
  };

  if (!device) return <div className="p-8 text-[hsl(var(--muted-foreground))]">Loading…</div>;
  const online = isOnline(device.last_seen);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/devices" className="text-[hsl(var(--muted-foreground))] hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{device.name ?? 'Unnamed Device'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className={`text-sm ${online ? 'text-green-400' : 'text-[hsl(var(--muted-foreground))]'}`}>{online ? 'Online' : 'Offline'}</span>
            {device.last_seen && <span className="text-sm text-[hsl(var(--muted-foreground))]">· Last seen {timeAgo(device.last_seen)}</span>}
          </div>
        </div>
      </div>

      {/* Device info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'IP Address', value: device.ip_address ?? '—' },
          { label: 'Resolution', value: device.resolution ?? '—' },
          { label: 'Version', value: device.version ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div>
            <div className="text-sm font-medium text-white mt-1">{value}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white">Device Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Display Name *</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Location</span>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Lobby, Break Room"
              className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Orientation</span>
            <select value={form.orientation} onChange={e => setForm(f => ({ ...f, orientation: e.target.value }))}
              className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Brightness: {form.brightness}%</span>
            <input type="range" min={10} max={100} value={form.brightness}
              onChange={e => setForm(f => ({ ...f, brightness: Number(e.target.value) }))}
              className="w-full accent-blue-500 mt-2" />
          </label>
        </div>
        <label className="space-y-1.5 block">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Notes</span>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} placeholder="Internal notes about this device"
            className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
        </label>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Push Playlist */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white">Push Content</h2>
        <div className="flex items-center gap-3">
          <select value={form.playlist_id} onChange={e => setForm(f => ({ ...f, playlist_id: e.target.value }))}
            className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
            <option value="">— Select playlist —</option>
            {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={pushPlaylist} disabled={!form.playlist_id}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Send className="w-4 h-4" /> Push Now
          </button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Instantly pushes the selected playlist to this device via real-time connection.</p>
      </div>
    </div>
  );
}
