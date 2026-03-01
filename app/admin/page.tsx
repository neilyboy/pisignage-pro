'use client';
import { useEffect, useState } from 'react';
import { Monitor, Tv2, Image, ListVideo, Wifi, Plus } from 'lucide-react';
import Link from 'next/link';
import { timeAgo, isOnline } from '@/lib/utils';
import type { Device } from '@/lib/types';

interface Stats {
  totalDevices: number;
  activeDevices: number;
  pendingDevices: number;
  totalAssets: number;
  totalPlaylists: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats/summary').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([s, d]) => {
      setStats(s);
      setDevices(d.slice(0, 6));
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: 'Total Devices', value: stats?.totalDevices ?? '-', icon: Tv2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Online Now', value: stats?.activeDevices ?? '-', icon: Wifi, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Pending Adoption', value: stats?.pendingDevices ?? '-', icon: Monitor, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Media Assets', value: stats?.totalAssets ?? '-', icon: Image, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Playlists', value: stats?.totalPlaylists ?? '-', icon: ListVideo, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">PiSignage Pro — Digital Signage Management</p>
        </div>
        <Link href="/admin/devices" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Device
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{loading ? '…' : value}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Devices list */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="font-semibold text-white">Devices</h2>
          <Link href="/admin/devices" className="text-sm text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {loading ? (
            <div className="p-6 text-center text-[hsl(var(--muted-foreground))]">Loading…</div>
          ) : devices.length === 0 ? (
            <div className="p-8 text-center">
              <Tv2 className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="text-[hsl(var(--muted-foreground))]">No devices yet</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Run the Pi setup script to add your first display</p>
              <Link href="/admin/settings" className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300">View setup instructions →</Link>
            </div>
          ) : devices.map((d) => {
            const online = isOnline(d.last_seen);
            return (
              <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${online ? 'bg-green-400' : d.status === 'pending' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {d.name ?? <span className="text-yellow-400">Pending — Code: {d.pairing_code}</span>}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{d.location ?? d.ip_address ?? 'Unknown location'}</div>
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {d.last_seen ? timeAgo(d.last_seen) : 'Never'}
                </div>
                <Link href={`/admin/devices/${d.id}`} className="text-xs text-blue-400 hover:text-blue-300">Manage →</Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
