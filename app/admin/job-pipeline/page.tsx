'use client';
import { useEffect, useState, useCallback } from 'react';
import type { JobPipelineItem, PipelineStage } from '@/lib/types';

const STAGES: { key: PipelineStage; label: string; color: string; icon: string; desc: string }[] = [
  { key: 'walkthru-req', label: 'Walk-Thru Req', color: '#6b7280', icon: '🚶', desc: 'Requested site visit' },
  { key: 'quote',        label: 'CBU / Quote',   color: '#3b82f6', icon: '📝', desc: 'Writing up estimate' },
  { key: 'forecast',     label: 'Forecast',      color: '#8b5cf6', icon: '📊', desc: 'Quote submitted, pending' },
  { key: 'won',          label: 'Won',           color: '#10b981', icon: '✅', desc: 'Job confirmed' },
  { key: 'on-hold',      label: 'On Hold',       color: '#f59e0b', icon: '⏸️', desc: 'Paused / waiting' },
];

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];

const BLANK: Omit<JobPipelineItem, 'id' | 'created_at' | 'updated_at' | 'position'> = {
  job_name: '', client: '', location: '', stage: 'walkthru-req', hours: 0, notes: '', color: '#3b82f6',
};

export default function JobPipelinePage() {
  const [jobs, setJobs] = useState<JobPipelineItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const load = useCallback(() => {
    fetch('/api/job-pipeline').then(r => r.json()).then(setJobs).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = (stage?: PipelineStage) => {
    setEditId(null);
    setForm({ ...BLANK, stage: stage ?? 'walkthru-req' });
    setShowModal(true);
  };

  const openEdit = (job: JobPipelineItem) => {
    setEditId(job.id);
    setForm({ job_name: job.job_name, client: job.client, location: job.location, stage: job.stage, hours: job.hours, notes: job.notes, color: job.color });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.job_name.trim()) return;
    if (editId) {
      await fetch(`/api/job-pipeline/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await fetch('/api/job-pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setShowModal(false);
    load();
  };

  const moveStage = async (job: JobPipelineItem, stage: PipelineStage) => {
    await fetch(`/api/job-pipeline/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this job?')) return;
    await fetch(`/api/job-pipeline/${id}`, { method: 'DELETE' });
    load();
  };

  const totalHours = (stage: PipelineStage) => jobs.filter(j => j.stage === stage).reduce((s, j) => s + (j.hours || 0), 0);
  const totalAllHours = jobs.reduce((s, j) => s + (j.hours || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Job Pipeline</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Track jobs through the sales & delivery pipeline. Total: <span className="text-white font-bold">{jobs.length} jobs</span> · <span className="text-white font-bold">{totalAllHours.toLocaleString()} hrs</span></p>
        </div>
        <button onClick={() => openNew()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Job
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-5 gap-4">
        {STAGES.map(stage => {
          const stageJobs = jobs.filter(j => j.stage === stage.key);
          const stageHours = totalHours(stage.key);
          return (
            <div key={stage.key} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: stage.color + '15', border: `1px solid ${stage.color}30` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{stage.icon}</span>
                    <span className="text-sm font-black" style={{ color: stage.color }}>{stage.label}</span>
                  </div>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: stage.color + '25', color: stage.color }}>
                    {stageJobs.length}
                  </span>
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{stage.desc}</div>
                {stageHours > 0 && (
                  <div className="text-[10px] font-bold" style={{ color: stage.color }}>{stageHours.toLocaleString()} hrs total</div>
                )}
              </div>

              {/* Cards */}
              <div className="space-y-2 flex-1">
                {stageJobs.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-center text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] opacity-50">
                    Empty
                  </div>
                )}
                {stageJobs.map(job => (
                  <div key={job.id} className="rounded-xl p-3 space-y-2 group cursor-pointer hover:ring-1 transition-all"
                    style={{ backgroundColor: job.color + '12', border: `1px solid ${job.color}25`, '--tw-ring-color': job.color + '60' } as React.CSSProperties}
                    onClick={() => openEdit(job)}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold text-sm text-white leading-tight">{job.job_name}</div>
                      <button onClick={e => { e.stopPropagation(); del(job.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-[10px] leading-none px-1 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-all flex-shrink-0">✕</button>
                    </div>
                    {job.client && <div className="text-xs text-[hsl(var(--muted-foreground))]">👤 {job.client}</div>}
                    {job.location && <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">📍 {job.location}</div>}
                    {job.hours > 0 && (
                      <div className="text-xs font-bold px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: job.color + '20', color: job.color }}>
                        ⏱ {job.hours} hrs
                      </div>
                    )}
                    {job.notes && <div className="text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-2">{job.notes}</div>}
                    {/* Stage move buttons */}
                    <div className="flex gap-1 flex-wrap opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                      {STAGES.filter(s => s.key !== stage.key).map(s => (
                        <button key={s.key} onClick={() => moveStage(job, s.key)}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors"
                          style={{ backgroundColor: s.color + '20', color: s.color }}>
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button onClick={() => openNew(stage.key)}
                className="rounded-xl border border-dashed border-[hsl(var(--border))] py-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30 transition-colors text-center">
                + Add to {stage.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-black text-white">{editId ? 'Edit Job' : 'Add Job'}</h2>

            <div className="space-y-3">
              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Job Name *</span>
                <input value={form.job_name} onChange={e => setForm(f => ({ ...f, job_name: e.target.value }))} placeholder="e.g. Riverside Hotel Security Upgrade"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Client</span>
                  <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Client name"
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Est. Hours</span>
                  <input type="number" min={0} step={0.5} value={form.hours} onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Location</span>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Address or site name"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Stage</span>
                <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as PipelineStage }))}
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white px-3 py-2 rounded-lg text-sm outline-none">
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </select>
              </label>

              <label className="space-y-1.5 block">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Notes</span>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="Any additional details..."
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </label>

              <div className="space-y-1.5">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Color</span>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={!form.job_name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                {editId ? 'Save Changes' : 'Add Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
