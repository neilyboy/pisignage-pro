'use client';
import { useEffect, useState, useRef } from 'react';
import { Image as ImageIcon, Video, Globe, Type, Youtube, Clock, Upload, Plus, Trash2, Edit2, Search, X, Download, RefreshCw } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

const TYPE_ICONS: Record<string, React.ElementType> = {
  image: ImageIcon, video: Video, webpage: Globe, text: Type, youtube: Youtube, clock: Clock, html: Type,
};
const TYPE_COLORS: Record<string, string> = {
  image: 'text-purple-400 bg-purple-500/10', video: 'text-blue-400 bg-blue-500/10',
  webpage: 'text-green-400 bg-green-500/10', text: 'text-yellow-400 bg-yellow-500/10',
  youtube: 'text-red-400 bg-red-500/10', clock: 'text-cyan-400 bg-cyan-500/10',
  html: 'text-orange-400 bg-orange-500/10',
};

type FormState = {
  name: string; type: string; url: string; file_path: string; duration: number;
  metadata: Record<string, unknown>; tags: string;
};

const DEFAULT_FORM: FormState = { name: '', type: 'image', url: '', file_path: '', duration: 10, metadata: {}, tags: '' };

export default function MediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [modalUploading, setModalUploading] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modalFileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/assets').then(r => r.json()).then(d => { setAssets(d); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = assets.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = (type = 'image') => {
    setEditId(null);
    setForm({ ...DEFAULT_FORM, type });
    setShowModal(true);
  };
  const openEdit = (a: Asset) => {
    setEditId(a.id);
    setForm({ name: a.name, type: a.type, url: a.url ?? '', file_path: a.file_path ?? '', duration: a.duration, metadata: a.metadata, tags: a.tags.join(', ') });
    setShowModal(true);
  };

  const save = async () => {
    const body = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    if (editId) {
      await fetch(`/api/assets/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setShowModal(false);
    load();
  };

  const uploadModalFile = async (file: File) => {
    setModalUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const { url } = await res.json();
    const autoName = file.name.replace(/\.[^.]+$/, '');
    setForm(f => ({
      ...f,
      file_path: url,
      name: f.name || autoName,
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));
    setModalUploading(false);
  };

  const deleteAsset = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    load();
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const { url } = await res.json();
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const name = file.name.replace(/\.[^.]+$/, '');
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, file_path: url, duration: type === 'video' ? 0 : 15, metadata: {}, tags: [] }),
    });
    setUploading(false);
    load();
  };

  const downloadYoutube = async () => {
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    await fetch('/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: ytUrl }) });
    setYtUrl('');
    setYtLoading(false);
    load();
    setTimeout(load, 5000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Media Library</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{assets.length} assets</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 border border-[hsl(var(--border))] hover:border-blue-500 text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
            <Upload className="w-4 h-4" />{uploading ? 'Uploading…' : 'Upload File'}
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          <button onClick={() => openAdd()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>
      </div>

      {/* YouTube downloader */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
        <Youtube className="w-5 h-5 text-red-400 flex-shrink-0" />
        <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="Paste YouTube URL to download as video asset…"
          onKeyDown={e => e.key === 'Enter' && downloadYoutube()}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-red-300/40" />
        <button onClick={downloadYoutube} disabled={ytLoading || !ytUrl.trim()}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
          <Download className="w-4 h-4" />{ytLoading ? 'Queuing…' : 'Download'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…"
            className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white pl-9 pr-3 py-2 rounded-lg text-sm outline-none" />
        </div>
        <div className="flex gap-1">
          {['all', 'image', 'video', 'youtube', 'webpage', 'text', 'clock'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterType === t ? 'bg-blue-600 text-white' : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--secondary))]'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg hover:bg-[hsl(var(--secondary))] transition-colors"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Drop zone + Grid */}
      <div
        className="min-h-[200px]"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-16 text-center">
            <Upload className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))] font-medium">Drop files here or click Upload</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Supports images, videos, and more</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(a => {
              const Icon = TYPE_ICONS[a.type] ?? ImageIcon;
              const colorClass = TYPE_COLORS[a.type] ?? 'text-gray-400 bg-gray-500/10';
              const isDownloading = (a.metadata as { status?: string })?.status === 'downloading';
              return (
                <div key={a.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden group hover:border-blue-500/50 transition-colors">
                  <div className="aspect-video bg-[hsl(var(--secondary))] relative flex items-center justify-center">
                    {a.file_path && (a.type === 'image') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.file_path} alt={a.name} className="w-full h-full object-cover" />
                    ) : a.thumbnail_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumbnail_path} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className={`w-10 h-10 ${colorClass.split(' ')[0]}`} />
                    )}
                    {isDownloading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-xs text-white text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-1" />Downloading…</div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(a)} className="p-1.5 bg-black/60 hover:bg-blue-600 text-white rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteAsset(a.id)} className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium text-white truncate">{a.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${colorClass}`}>{a.type}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatDuration(a.duration)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editId ? 'Edit Asset' : 'Add Asset'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[hsl(var(--muted-foreground))] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Type</span>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
                  {['image', 'video', 'webpage', 'text', 'html', 'clock'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Name</span>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
              </label>
              {['image', 'video'].includes(form.type) && (
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">File</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => modalFileRef.current?.click()}
                      disabled={modalUploading}
                      className="flex items-center gap-2 border border-[hsl(var(--border))] hover:border-blue-500 text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40">
                      <Upload className="w-4 h-4" />{modalUploading ? 'Uploading…' : 'Choose File'}
                    </button>
                    {form.file_path && <span className="text-xs text-green-400 truncate max-w-[200px]">{form.file_path.split('/').pop()}</span>}
                  </div>
                  <input ref={modalFileRef} type="file" accept={form.type === 'video' ? 'video/*' : 'image/*'} className="hidden"
                    onChange={e => e.target.files?.[0] && uploadModalFile(e.target.files[0])} />
                </label>
              )}
              {['webpage', 'text', 'html'].includes(form.type) && (
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{form.type === 'webpage' ? 'URL' : form.type === 'html' ? 'HTML Content' : 'Text Content'}</span>
                  {form.type === 'html' ? (
                    <textarea value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} rows={4}
                      className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none font-mono resize-none" />
                  ) : (
                    <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder={form.type === 'webpage' ? 'https://…' : 'Enter text to display'}
                      className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                  )}
                </label>
              )}
              {form.type !== 'clock' && (
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Duration (seconds)</span>
                  <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </label>
              )}
              {form.type === 'image' && (
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Image Fit</span>
                  <select value={(form.metadata.fit as string) ?? 'cover'} onChange={e => setForm(f => ({ ...f, metadata: { ...f.metadata, fit: e.target.value } }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
                    <option value="cover">Cover (fill screen, crop)</option>
                    <option value="contain">Contain (letterbox)</option>
                    <option value="fill">Stretch to fill</option>
                  </select>
                </label>
              )}
              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Tags (comma-separated)</span>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="lobby, promo, news"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={!form.name} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                {editId ? 'Save Changes' : 'Add Asset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
