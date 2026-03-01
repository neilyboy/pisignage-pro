'use client';
import { useEffect, useState } from 'react';
import { Tv2, RefreshCw, ChevronRight, MapPin, Check, X, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';
import { timeAgo, isOnline } from '@/lib/utils';
import type { Device } from '@/lib/types';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  const [adoptName, setAdoptName] = useState('');
  const [adoptLocation, setAdoptLocation] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/devices').then(r => r.json()).then(d => { setDevices(d); setLoading(false); });
  };

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const adopt = async (device: Device) => {
    if (!adoptName.trim()) return;
    await fetch(`/api/devices/${device.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: adoptName, location: adoptLocation, status: 'active' }),
    });
    setAdoptingId(null);
    setAdoptName('');
    setAdoptLocation('');
    load();
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Delete this device?')) return;
    await fetch(`/api/devices/${id}`, { method: 'DELETE' });
    load();
  };

  const pending = devices.filter(d => d.status === 'pending');
  const active = devices.filter(d => d.status !== 'pending');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Devices</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{devices.length} device{devices.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-[hsl(var(--border))] hover:border-blue-500 text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Pending Adoption */}
      {pending.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-yellow-500/20">
            <h2 className="font-semibold text-yellow-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Adoption ({pending.length})
            </h2>
            <p className="text-xs text-yellow-300/70 mt-0.5">These devices are waiting to be named and adopted into your network.</p>
          </div>
          <div className="divide-y divide-yellow-500/10">
            {pending.map(d => (
              <div key={d.id} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Tv2 className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Pairing Code: <span className="font-mono text-yellow-400 text-lg tracking-widest">{d.pairing_code}</span></div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">IP: {d.ip_address ?? 'unknown'} · Joined {timeAgo(d.created_at)}</div>
                  </div>
                  {adoptingId === d.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        placeholder="Device name *"
                        value={adoptName}
                        onChange={e => setAdoptName(e.target.value)}
                        className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-1.5 rounded-lg text-sm w-40"
                        onKeyDown={e => e.key === 'Enter' && adopt(d)}
                      />
                      <input
                        placeholder="Location (optional)"
                        value={adoptLocation}
                        onChange={e => setAdoptLocation(e.target.value)}
                        className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-1.5 rounded-lg text-sm w-40"
                        onKeyDown={e => e.key === 'Enter' && adopt(d)}
                      />
                      <button onClick={() => adopt(d)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Adopt</button>
                      <button onClick={() => setAdoptingId(null)} className="border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-1.5 rounded-lg text-sm"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setAdoptingId(d.id); setAdoptName(''); setAdoptLocation(''); }}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-sm font-medium">
                      Adopt Device
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Devices */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(var(--border))]">
          <h2 className="font-semibold text-white">Active Devices</h2>
        </div>
        {loading && active.length === 0 ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div>
        ) : active.length === 0 ? (
          <div className="p-10 text-center">
            <Tv2 className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <p className="text-[hsl(var(--muted-foreground))] font-medium">No adopted devices yet</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Run the Pi setup script on a Raspberry Pi to get started.</p>
            <Link href="/admin/settings" className="mt-4 inline-block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">View Setup Instructions</Link>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {active.map(d => {
              const online = isOnline(d.last_seen);
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[hsl(var(--secondary))/50] transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${online ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-500'}`} />
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center flex-shrink-0">
                    <Tv2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{d.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2 mt-0.5">
                      {d.location && <><MapPin className="w-3 h-3" />{d.location}</>}
                      {d.ip_address && <span>{d.ip_address}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${online ? 'text-green-400' : 'text-gray-500'}`}>{online ? 'Online' : 'Offline'}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{d.last_seen ? timeAgo(d.last_seen) : 'Never'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/devices/${d.id}`} className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors">
                      Manage <ChevronRight className="w-3 h-3" />
                    </Link>
                    <button onClick={() => deleteDevice(d.id)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
