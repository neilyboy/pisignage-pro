'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { Playlist, Asset } from '@/lib/types';

interface PlaylistItem {
  id: string;
  asset_id: string;
  duration_override: number | null;
  asset: Asset;
}

export default function DisplayPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [announcement, setAnnouncement] = useState<{ text: string; color: string; bg_color: string; speed: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentIndexRef = useRef(0);
  const itemsRef = useRef<PlaylistItem[]>([]);

  currentIndexRef.current = currentIndex;
  itemsRef.current = items;

  const advance = useCallback(() => {
    setCurrentIndex(i => {
      const next = (i + 1) % Math.max(itemsRef.current.length, 1);
      return next;
    });
  }, []);

  const scheduleAdvance = useCallback((durationMs: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(advance, durationMs);
  }, [advance]);

  const loadPlaylist = useCallback(async (playlistId: string) => {
    const res = await fetch(`/api/playlists/${playlistId}`);
    if (!res.ok) return;
    const pl = await res.json();
    setPlaylist(pl);
    setItems(pl.items ?? []);
    setCurrentIndex(0);
  }, []);

  // Heartbeat every 10s
  useEffect(() => {
    const beat = async () => {
      try {
        const res = await fetch(`/api/devices/${deviceId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_index: currentIndexRef.current,
            playlist_id: playlist?.id ?? null,
          }),
        });
        const data = await res.json();
        if (data.playlist_id && data.playlist_id !== playlist?.id) {
          loadPlaylist(data.playlist_id);
        }
      } catch {}
    };
    beat();
    const t = setInterval(beat, 10000);
    return () => clearInterval(t);
  }, [deviceId, playlist?.id, loadPlaylist]);

  // SSE for real-time push
  useEffect(() => {
    const es = new EventSource(`/api/devices/${deviceId}/stream`);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'playlist') loadPlaylist(event.playlist_id);
        if (event.type === 'announcement') {
          setAnnouncement({ text: event.text, color: event.color, bg_color: event.bg_color, speed: event.speed ?? 50 });
          setTimeout(() => setAnnouncement(null), 30000);
        }
        if (event.type === 'reload') window.location.reload();
        if (event.type === 'brightness') {
          document.documentElement.style.filter = `brightness(${(event.value ?? 100) / 100})`;
        }
      } catch {}
    };
    return () => es.close();
  }, [deviceId, loadPlaylist]);

  // Schedule current asset timer
  useEffect(() => {
    if (items.length === 0) return;
    const item = items[currentIndex];
    if (!item) return;
    const duration = (item.duration_override ?? item.asset?.duration ?? 10) * 1000;
    if (item.asset?.type !== 'video') {
      scheduleAdvance(duration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIndex, items, scheduleAdvance]);

  const currentItem = items[currentIndex];
  const asset = currentItem?.asset;

  const renderAsset = () => {
    if (!asset) return null;
    switch (asset.type) {
      case 'image':
        return (
          <img
            src={asset.file_path ? asset.file_path : asset.url ?? ''}
            alt={asset.name}
            className="w-full h-full"
            style={{ objectFit: (asset.metadata as { fit?: string })?.fit === 'contain' ? 'contain' : 'cover' }}
          />
        );
      case 'video':
      case 'youtube':
        return (
          <video
            key={asset.id + currentIndex}
            src={asset.file_path ?? undefined}
            className="w-full h-full object-cover"
            autoPlay muted playsInline
            onEnded={advance}
          />
        );
      case 'webpage':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {(asset.metadata as { screenshot?: string })?.screenshot ? (
              <img src={(asset.metadata as { screenshot: string }).screenshot} className="w-full h-full object-cover" alt={asset.name} />
            ) : (
              <div className="text-white text-center p-8">
                <div className="text-2xl font-bold mb-2">{asset.name}</div>
                <div className="text-gray-400">{asset.url}</div>
              </div>
            )}
          </div>
        );
      case 'text':
      case 'html':
        return (
          <div
            className="w-full h-full flex items-center justify-center p-12 text-center"
            style={{ background: (asset.metadata as { bg?: string })?.bg ?? '#0f172a' }}
            dangerouslySetInnerHTML={asset.type === 'html' ? { __html: asset.url ?? '' } : undefined}
          >
            {asset.type !== 'html' && (
              <div style={{ color: (asset.metadata as { color?: string })?.color ?? '#ffffff', fontSize: (asset.metadata as { fontSize?: string })?.fontSize ?? '4rem', fontWeight: 'bold' }}>
                {asset.url}
              </div>
            )}
          </div>
        );
      case 'clock':
        return <ClockWidget />;
      default:
        return <div className="w-full h-full bg-black flex items-center justify-center text-white">{asset.name}</div>;
    }
  };

  if (!playlist && items.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="text-6xl font-bold text-blue-400 mb-4">PiSignage Pro</div>
        <div className="text-xl text-gray-400">No playlist assigned</div>
        <div className="mt-4 text-gray-600 text-sm">Device ID: {deviceId}</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {renderAsset()}

      {/* Announcement ticker */}
      {announcement && (
        <div
          className="absolute bottom-0 left-0 right-0 py-3 overflow-hidden"
          style={{ backgroundColor: announcement.bg_color }}
        >
          <div
            className="whitespace-nowrap inline-block"
            style={{
              color: announcement.color,
              fontSize: '1.5rem',
              fontWeight: 600,
              animation: `marquee ${100 - announcement.speed + 10}s linear infinite`,
            }}
          >
            {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

function ClockWidget() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full h-full bg-[#0a0a1a] flex flex-col items-center justify-center">
      <div className="text-white font-mono text-[12vw] font-bold tracking-tight">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-gray-400 text-[3vw] mt-2">
        {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
