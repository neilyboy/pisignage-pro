'use client';
import { useEffect, useState } from 'react';
import { Tv2, Image, Activity, Clock } from 'lucide-react';
import { isOnline, timeAgo } from '@/lib/utils';
interface DeviceStats {
  id: string;
  name: string;
  last_seen: number | null;
  status: string;
  current_playlist_id: string | null;
  playlist_name?: string;
  pairing_code?: string;
  created_at?: number;
}

export default function AnalyticsPage() {
  const [devices, setDevices] = useState<DeviceStats[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/devices').then(r => r.json()),
      fetch('/api/stats/summary').then(r => r.json()),
    ]).then(([d, s]) => {
      setDevices(d);
      setSummary(s);
      setLoading(false);
    });
    const t = setInterval(() => {
      fetch('/api/devices').then(r => r.json()).then(setDevices);
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const online = devices.filter(d => isOnline(d.last_seen) && d.status !== 'pending');
  const offline = devices.filter(d => !isOnline(d.last_seen) && d.status !== 'pending');
  const pending = devices.filter(d => d.status === 'pending');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Live device status and system overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Online Devices', value: loading ? '…' : online.length, icon: Tv2, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Offline Devices', value: loading ? '…' : offline.length, icon: Tv2, color: 'text-gray-400', bg: 'bg-gray-500/10' },
          { label: 'Total Assets', value: loading ? '…' : (summary.totalAssets ?? 0), icon: Image, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Active Playlists', value: loading ? '…' : (summary.totalPlaylists ?? 0), icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Live device grid */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h2 className="font-semibold text-white">Live Device Status</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Updates every 10s</span>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div>
        ) : devices.filter(d => d.status !== 'pending').length === 0 ? (
          <div className="p-12 text-center">
            <Tv2 className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <p className="text-[hsl(var(--muted-foreground))]">No active devices yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {devices.filter(d => d.status !== 'pending').map(d => {
              const live = isOnline(d.last_seen);
              return (
                <div key={d.id} className={`border rounded-xl p-4 transition-colors ${live ? 'border-green-500/30 bg-green-500/5' : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))/30]'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${live ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-gray-500'}`} />
                    <div className="font-medium text-white text-sm">{d.name ?? 'Unnamed'}</div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${live ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                      {live ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {d.last_seen ? timeAgo(d.last_seen) : 'Never connected'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <h3 className="text-yellow-400 font-medium mb-2">Pending Adoption ({pending.length})</h3>
          <div className="space-y-1">
            {pending.map(d => (
              <div key={d.id} className="text-sm text-yellow-300/70">Code: {d.pairing_code} — registered {d.created_at ? timeAgo(d.created_at) : '—'}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
