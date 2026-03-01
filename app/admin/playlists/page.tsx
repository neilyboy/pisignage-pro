'use client';
import { useEffect, useState } from 'react';
import { ListVideo, Plus, Trash2, Clock, GripVertical, X, Check, Shuffle, Repeat } from 'lucide-react';
import type { Playlist, Asset } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface PlaylistItem { id: string; asset_id: string; position: number; duration_override: number | null; asset: Asset; }

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const loadAll = () => {
    Promise.all([
      fetch('/api/playlists').then(r => r.json()),
      fetch('/api/assets').then(r => r.json()),
    ]).then(([p, a]) => { setPlaylists(p); setAssets(a); setLoading(false); });
  };
  useEffect(() => { loadAll(); }, []);

  const selectPlaylist = (pl: Playlist) => {
    setSelected(pl);
    setItems((pl as unknown as { items: PlaylistItem[] }).items ?? []);
  };

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
    const pl = await res.json();
    setPlaylists(p => [pl, ...p]);
    setShowNew(false);
    setNewName('');
    selectPlaylist(pl);
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist?')) return;
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    if (selected?.id === id) { setSelected(null); setItems([]); }
    setPlaylists(p => p.filter(x => x.id !== id));
  };

  const addAsset = (asset: Asset) => {
    const newItem: PlaylistItem = {
      id: crypto.randomUUID(), asset_id: asset.id, position: items.length, duration_override: null, asset,
    };
    setItems(i => [...i, newItem]);
  };

  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));

  const savePlaylist = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/playlists/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: selected.name, loop: selected.loop, shuffle: selected.shuffle, transition: selected.transition,
        items: items.map(item => ({ asset_id: item.asset_id, duration_override: item.duration_override })),
      }),
    });
    setSaving(false);
    loadAll();
  };

  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      setDragIdx(idx);
      return next;
    });
  };
  const onDragEnd = () => setDragIdx(null);

  const totalDuration = items.reduce((acc, item) => acc + (item.duration_override ?? item.asset?.duration ?? 10), 0);

  return (
    <div className="flex h-full">
      {/* Playlist list */}
      <div className="w-64 border-r border-[hsl(var(--border))] flex flex-col">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Playlists</h2>
            <button onClick={() => setShowNew(true)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Plus className="w-4 h-4" /></button>
          </div>
          {showNew && (
            <div className="flex gap-2">
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Playlist name"
                onKeyDown={e => { if (e.key === 'Enter') createPlaylist(); if (e.key === 'Escape') setShowNew(false); }}
                className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-2 py-1.5 rounded-lg text-sm outline-none" />
              <button onClick={createPlaylist} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"><Check className="w-4 h-4" /></button>
              <button onClick={() => setShowNew(false)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? <div className="p-4 text-sm text-[hsl(var(--muted-foreground))]">Loading…</div>
            : playlists.length === 0 ? <div className="p-4 text-sm text-[hsl(var(--muted-foreground))]">No playlists yet</div>
            : playlists.map(pl => (
              <div key={pl.id}
                onClick={() => selectPlaylist(pl)}
                className={`flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer group transition-colors ${selected?.id === pl.id ? 'bg-blue-600' : 'hover:bg-[hsl(var(--secondary))]'}`}>
                <ListVideo className={`w-4 h-4 flex-shrink-0 ${selected?.id === pl.id ? 'text-white' : 'text-[hsl(var(--muted-foreground))]'}`} />
                <span className={`flex-1 text-sm truncate ${selected?.id === pl.id ? 'text-white font-medium' : 'text-[hsl(var(--muted-foreground))]'}`}>{pl.name}</span>
                <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[hsl(var(--muted-foreground))] rounded transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
            <div className="text-center">
              <ListVideo className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a playlist to edit</p>
            </div>
          </div>
        ) : (
          <>
            {/* Playlist items */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-4 px-5 py-3 border-b border-[hsl(var(--border))]">
                <h2 className="font-semibold text-white flex-1">{selected.name}</h2>
                <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                  <span>{items.length} items · {formatDuration(totalDuration)}</span>
                  <button onClick={() => setSelected(s => s ? { ...s, loop: !s.loop } : s)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${selected.loop ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'}`}>
                    <Repeat className="w-3 h-3" /> Loop
                  </button>
                  <button onClick={() => setSelected(s => s ? { ...s, shuffle: !s.shuffle } : s)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${selected.shuffle ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'}`}>
                    <Shuffle className="w-3 h-3" /> Shuffle
                  </button>
                </div>
                <button onClick={savePlaylist} disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
                  {saving ? 'Saving…' : 'Save Playlist'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {items.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[hsl(var(--muted-foreground))] border-2 border-dashed border-[hsl(var(--border))] rounded-xl">
                    <div className="text-center py-16">
                      <p className="font-medium">Playlist is empty</p>
                      <p className="text-sm mt-1">Add assets from the panel on the right →</p>
                    </div>
                  </div>
                ) : items.map((item, idx) => (
                  <div key={item.id} draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDragEnd={onDragEnd}
                    className={`flex items-center gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing ${dragIdx === idx ? 'opacity-50' : ''}`}>
                    <GripVertical className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                    <div className="w-6 h-6 rounded bg-[hsl(var(--secondary))] flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))] flex-shrink-0">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{item.asset?.name}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{item.asset?.type}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      <input type="number" min={1} value={item.duration_override ?? item.asset?.duration ?? 10}
                        onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, duration_override: Number(e.target.value) } : x))}
                        className="w-14 bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white text-xs px-2 py-1 rounded text-center outline-none" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">s</span>
                    </div>
                    <button onClick={() => removeItem(idx)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset picker */}
            <div className="w-64 border-l border-[hsl(var(--border))] flex flex-col">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                <h3 className="text-sm font-semibold text-white">Add Assets</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {assets.map(a => (
                  <button key={a.id} onClick={() => addAsset(a)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[hsl(var(--secondary))] text-left transition-colors group">
                    <div className="w-7 h-7 rounded bg-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">{'🖼'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{a.name}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{a.type} · {formatDuration(a.duration)}</div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
