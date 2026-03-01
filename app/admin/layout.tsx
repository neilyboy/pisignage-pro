'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Monitor, Image, ListVideo, Calendar, Bell, BarChart2,
  Settings, Tv2, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: Monitor, exact: true },
  { href: '/admin/devices', label: 'Devices', icon: Tv2 },
  { href: '/admin/media', label: 'Media Library', icon: Image },
  { href: '/admin/playlists', label: 'Playlists', icon: ListVideo },
  { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[hsl(222,47%,9%)] border-r border-[hsl(var(--border))]">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-[hsl(var(--border))]">
          <Layers className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-white text-lg tracking-tight">PiSignage<span className="text-blue-400">Pro</span></span>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors',
                  active
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--secondary))]'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[hsl(var(--border))]">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">PiSignage Pro v1.0</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
