'use client';
import { useEffect, useState, useCallback } from 'react';
import type { JobPipelineItem, PipelineStage } from '@/lib/types';
import { getTheme, DEFAULT_THEME, type DayTheme } from '@/lib/themes';

const STAGES: { key: PipelineStage; label: string; color: string; icon: string }[] = [
  { key: 'walkthru-req', label: 'Walk-Thru Req', color: '#6b7280', icon: '🚶' },
  { key: 'quote',        label: 'CBU / Quote',   color: '#3b82f6', icon: '📝' },
  { key: 'forecast',     label: 'Forecast',      color: '#8b5cf6', icon: '📊' },
  { key: 'won',          label: 'Won',           color: '#10b981', icon: '✅' },
  { key: 'on-hold',      label: 'On Hold',       color: '#f59e0b', icon: '⏸️' },
];

interface WeatherData {
  city: string; country: string; temp: number; description: string; icon: string; units: string;
}

function weatherEmoji(icon: string): string {
  const code = icon.replace('n', 'd');
  const map: Record<string, string> = {
    '01d': '☀️', '02d': '🌤️', '03d': '🌥️', '04d': '☁️',
    '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
  };
  return map[code] ?? '🌡️';
}

function LiveClock({ theme }: { theme: DayTheme }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return (
    <div className="tabular-nums text-right leading-none">
      <span className="text-5xl font-black" style={{ color: theme.textPrimary }}>{h12}:{m}</span>
      <span className="text-2xl font-black ml-1" style={{ color: theme.accent }}>{ampm}</span>
      <span className="text-xl ml-1.5" style={{ color: theme.clockSeconds }}>{s}</span>
    </div>
  );
}

export default function JobPipelineWidget() {
  const [jobs, setJobs] = useState<JobPipelineItem[]>([]);
  const [theme, setTheme] = useState<DayTheme>(DEFAULT_THEME);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const load = useCallback(() => {
    fetch('/api/job-pipeline').then(r => r.json()).then(setJobs).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      setTheme(getTheme(s.display_theme ?? 'midnight', s.display_theme_custom));
    }).catch(() => {});
    fetch('/api/weather').then(r => r.json()).then(d => {
      if (!d.error) setWeather(d as WeatherData);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const totalJobs = jobs.length;
  const totalHours = jobs.reduce((s, j) => s + (j.hours || 0), 0);
  const wonJobs = jobs.filter(j => j.stage === 'won');
  const wonHours = wonJobs.reduce((s, j) => s + (j.hours || 0), 0);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: theme.bgGradient, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: theme.headerBorder }}>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>Job Pipeline</div>
            <div className="flex items-center gap-4 mt-0.5">
              <div className="text-2xl font-black" style={{ color: theme.textPrimary }}>
                {totalJobs} <span className="text-base font-semibold" style={{ color: theme.textMuted }}>jobs</span>
              </div>
              <div className="text-xl font-black" style={{ color: theme.textPrimary }}>
                {totalHours.toLocaleString()} <span className="text-sm font-semibold" style={{ color: theme.textMuted }}>hrs total</span>
              </div>
              {wonHours > 0 && (
                <div className="text-xl font-black" style={{ color: '#10b981' }}>
                  {wonHours.toLocaleString()} <span className="text-sm font-semibold" style={{ color: theme.textMuted }}>hrs won</span>
                </div>
              )}
            </div>
          </div>
          {weather && (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl"
              style={{ backgroundColor: theme.accent + '15', border: `1px solid ${theme.accent}30` }}>
              <span className="text-2xl leading-none">{weatherEmoji(weather.icon)}</span>
              <div>
                <div className="text-xl font-black tabular-nums leading-none" style={{ color: theme.textPrimary }}>
                  {weather.temp}°{weather.units === 'imperial' ? 'F' : weather.units === 'metric' ? 'C' : 'K'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider capitalize" style={{ color: theme.textMuted }}>
                  {weather.description}
                </div>
              </div>
            </div>
          )}
        </div>
        <LiveClock theme={theme} />
      </div>

      {/* Pipeline columns */}
      <div className="flex-1 overflow-hidden px-4 pb-4 pt-3 flex gap-3">
        {STAGES.map(stage => {
          const stageJobs = jobs.filter(j => j.stage === stage.key);
          const stageHours = stageJobs.reduce((s, j) => s + (j.hours || 0), 0);

          return (
            <div key={stage.key} className="flex-1 flex flex-col min-w-0 gap-2">
              {/* Stage header */}
              <div className="flex-shrink-0 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: stage.color + '18', border: `1px solid ${stage.color}35` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{stage.icon}</span>
                    <span className="text-sm font-black" style={{ color: stage.color }}>{stage.label}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: stage.color + '25', color: stage.color }}>
                    {stageJobs.length}
                  </span>
                </div>
                {stageHours > 0 && (
                  <div className="text-[10px] font-bold mt-1" style={{ color: stage.color }}>
                    ⏱ {stageHours.toLocaleString()} hrs
                  </div>
                )}
              </div>

              {/* Job cards */}
              <div className="flex-1 overflow-hidden space-y-2">
                {stageJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-6 text-center text-[9px] uppercase tracking-widest"
                    style={{ borderColor: theme.headerBorder, color: theme.textMuted }}>
                    None
                  </div>
                ) : stageJobs.map(job => (
                  <div key={job.id} className="rounded-xl p-3 space-y-1.5"
                    style={{ backgroundColor: job.color + '14', borderLeft: `3px solid ${job.color}` }}>
                    <div className="font-black text-sm leading-tight" style={{ color: theme.textPrimary }}>
                      {job.job_name}
                    </div>
                    {job.client && (
                      <div className="text-[11px] font-semibold" style={{ color: theme.textMuted }}>
                        👤 {job.client}
                      </div>
                    )}
                    {job.location && (
                      <div className="text-[10px] truncate" style={{ color: theme.textMuted }}>
                        📍 {job.location}
                      </div>
                    )}
                    {job.hours > 0 && (
                      <div className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: job.color + '22', color: job.color }}>
                        ⏱ {job.hours} hrs
                      </div>
                    )}
                    {job.notes && (
                      <div className="text-[10px] leading-relaxed line-clamp-2" style={{ color: theme.textMuted }}>
                        {job.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
