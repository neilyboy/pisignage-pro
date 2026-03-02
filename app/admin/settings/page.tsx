'use client';
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, Download, Upload, Image as ImageIcon, Clock, Save, Monitor, RefreshCw, Wifi, WifiOff, Activity, Settings2, ChevronDown, ChevronRight, Palette } from 'lucide-react';
import type { Device } from '@/lib/types';
import { THEMES, type DayTheme } from '@/lib/themes';

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [brandEnabled, setBrandEnabled] = useState(false);
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandPosition, setBrandPosition] = useState('bottom-right');
  const [brandSize, setBrandSize] = useState('120');
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [activeThemeId, setActiveThemeId] = useState('midnight');
  const [customTheme, setCustomTheme] = useState<Partial<DayTheme>>({});
  const [uploading, setUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [pushingDevice, setPushingDevice] = useState<string | null>(null);
  const [pushLog, setPushLog] = useState<{ time: string; msg: string; ok: boolean }[]>([]);
  const [showDiag, setShowDiag] = useState(false);

  const loadDevices = () => {
    setDevicesLoading(true);
    fetch('/api/devices').then(r => r.json()).then(d => { setDevices(d); setDevicesLoading(false); }).catch(() => setDevicesLoading(false));
  };

  const logPush = (msg: string, ok: boolean) => {
    const time = new Date().toLocaleTimeString();
    setPushLog(l => [{ time, msg, ok }, ...l].slice(0, 20));
  };

  const pushDevice = async (deviceId: string, type: string, label: string) => {
    setPushingDevice(deviceId + type);
    try {
      const res = await fetch(`/api/devices/${deviceId}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const ok = res.ok;
      const dev = devices.find(d => d.id === deviceId);
      logPush(`${label} → ${dev?.name ?? deviceId.slice(0, 8)}`, ok);
    } catch {
      logPush(`${label} → FAILED`, false);
    }
    setPushingDevice(null);
  };

  const pushAll = async (type: string, label: string) => {
    setPushingDevice('all-' + type);
    const active = devices.filter(d => d.status === 'active');
    if (active.length === 0) { logPush(`${label}: no online devices`, false); setPushingDevice(null); return; }
    await Promise.all(active.map(d => fetch(`/api/devices/${d.id}/push`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })));
    logPush(`${label} → ${active.length} device${active.length !== 1 ? 's' : ''}`, true);
    setPushingDevice(null);
  };

  const pushSettingsRefresh = async () => {
    setPushingDevice('all-settings');
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_enabled: String(brandEnabled),
          brand_logo_url: brandLogoUrl,
          brand_position: brandPosition,
          brand_size: brandSize,
          work_start: workStart,
          work_end: workEnd,
          display_theme: activeThemeId,
          display_theme_custom: JSON.stringify(customTheme),
        }),
      });
      logPush('Settings pushed to all displays', true);
    } catch {
      logPush('Settings push FAILED', false);
    }
    setPushingDevice(null);
  };

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      setBrandEnabled(s.brand_enabled === 'true');
      setBrandLogoUrl(s.brand_logo_url ?? '');
      setBrandPosition(s.brand_position ?? 'bottom-right');
      setBrandSize(s.brand_size ?? '120');
      setWorkStart(s.work_start ?? '08:00');
      setWorkEnd(s.work_end ?? '17:00');
      setActiveThemeId(s.display_theme ?? 'midnight');
      if (s.display_theme_custom) { try { setCustomTheme(JSON.parse(s.display_theme_custom)); } catch {} }
    });
    loadDevices();
    const t = setInterval(loadDevices, 15000);
    return () => clearInterval(t);
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_enabled: String(brandEnabled),
        brand_logo_url: brandLogoUrl,
        brand_position: brandPosition,
        brand_size: brandSize,
        work_start: workStart,
        work_end: workEnd,
        display_theme: activeThemeId,
        display_theme_custom: JSON.stringify(customTheme),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const { url } = await res.json();
    setBrandLogoUrl(url);
    setUploading(false);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const serverUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}` : 'http://YOUR_SERVER_IP:3000';

  const setupScript = `#!/bin/bash
# PiSignage Pro — Pi Zero 2W Setup Script
# Run: curl -sL ${serverUrl}/api/pi-setup | bash

SERVER_URL="${serverUrl}"

echo "==> Installing dependencies..."
sudo apt-get update -qq
sudo apt-get install -y chromium-browser unclutter xserver-xorg xinit x11-xserver-utils

echo "==> Registering with server..."
IP=$(hostname -I | awk '{print $1}')
RESPONSE=$(curl -sf -X POST "$SERVER_URL/api/devices" \\
  -H "Content-Type: application/json" \\
  -d "{\\"ip_address\\":\\"$IP\\",\\"version\\":\\"1.0\\"}")

DEVICE_ID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
PAIR_CODE=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['pairing_code'])")

echo "==> Device ID: $DEVICE_ID"
echo "==> Pairing code: $PAIR_CODE"

# Save config
mkdir -p ~/.pisignage
echo "$DEVICE_ID" > ~/.pisignage/device_id
echo "$SERVER_URL" > ~/.pisignage/server_url

# Create xinitrc
cat > ~/.xinitrc << EOF
xset s off
xset s noblank
xset -dpms
unclutter -idle 0 -root &
exec chromium-browser \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --no-first-run \\
  --disable-session-crashed-bubble \\
  --autoplay-policy=no-user-gesture-required \\
  --remote-debugging-port=9222 \\
  --disable-translate \\
  --overscroll-history-navigation=0 \\
  "$SERVER_URL/pair/$PAIR_CODE"
EOF

# Auto-start X on login
if ! grep -q "startx" ~/.bash_profile 2>/dev/null; then
  echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx' >> ~/.bash_profile
fi

# Auto-login
sudo raspi-config nonint do_boot_behaviour B2 2>/dev/null || true
sudo systemctl set-default multi-user.target 2>/dev/null || true
sudo sed -i 's/^ExecStart=.*/ExecStart=-\\/sbin\\/agetty --autologin pi --noclear %I \\$TERM/' \\
  /etc/systemd/system/getty@tty1.service 2>/dev/null || true
sudo systemctl daemon-reload 2>/dev/null || true

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  Pairing Code: $PAIR_CODE"
echo "  Visit $SERVER_URL/admin/devices"
echo "  and adopt this device to get started."
echo "============================================"
echo ""
echo "Rebooting in 5 seconds... (Ctrl+C to cancel)"
sleep 5
sudo reboot`;

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative bg-[hsl(222,47%,8%)] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      <button onClick={() => copy(code, id)}
        className="absolute top-3 right-3 flex items-center gap-1.5 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors z-10">
        {copied === id ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
      </button>
      <pre className="p-4 pt-3 text-sm text-green-300 overflow-x-auto font-mono leading-relaxed">{code}</pre>
    </div>
  );

  const POSITIONS = [
    { value: 'top-left',     label: 'Top Left' },
    { value: 'top-right',    label: 'Top Right' },
    { value: 'bottom-left',  label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Branding, work hours, and Pi setup</p>
        </div>
        <button onClick={saveSettings} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium">
          {saved ? <><Check className="w-4 h-4 text-green-300" /> Saved!</> : saving ? 'Saving…' : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
      </div>

      {/* ── Branding ─────────────────────────────────────────────────────────── */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-white text-lg">Branding / Logo Overlay</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Show on screen</span>
            <div onClick={() => setBrandEnabled(e => !e)}
              className={`w-11 h-6 rounded-full relative transition-colors ${brandEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${brandEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Logo upload */}
          <div className="col-span-2 space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">Logo Image (PNG with transparency recommended)</label>
            <div className="flex items-center gap-3">
              <button onClick={() => logoFileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 border border-[hsl(var(--border))] hover:border-blue-500 text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload Logo'}
              </button>
              <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              {brandLogoUrl && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brandLogoUrl} alt="logo preview" className="h-10 object-contain rounded border border-[hsl(var(--border))] bg-gray-800 px-2" />
                  <span className="text-xs text-green-400 truncate max-w-[180px]">{brandLogoUrl.split('/').pop()}</span>
                  <button onClick={() => setBrandLogoUrl('')} className="text-xs text-red-400 hover:text-red-300">✕ Remove</button>
                </div>
              )}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">Screen Position</label>
            <div className="grid grid-cols-2 gap-2">
              {POSITIONS.map(p => (
                <button key={p.value} onClick={() => setBrandPosition(p.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${brandPosition === p.value ? 'bg-blue-600 border-blue-500 text-white' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-blue-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size + Preview */}
          <div className="space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">Logo Size: <span className="text-white font-bold">{brandSize}px</span></label>
            <input type="range" min="40" max="400" step="10" value={brandSize}
              onChange={e => setBrandSize(e.target.value)}
              className="w-full accent-blue-500" />
            <div className="text-xs text-[hsl(var(--muted-foreground))]">40px (small) → 400px (large)</div>
            {/* Mini preview */}
            {brandLogoUrl && (
              <div className="relative bg-gray-900 rounded-lg border border-[hsl(var(--border))] overflow-hidden mt-2"
                style={{ height: '90px', aspectRatio: '16/9' }}>
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-700">Screen Preview</div>
                <div className={`absolute p-2 ${brandPosition === 'top-left' ? 'top-0 left-0' : brandPosition === 'top-right' ? 'top-0 right-0' : brandPosition === 'bottom-left' ? 'bottom-0 left-0' : 'bottom-0 right-0'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brandLogoUrl} alt="preview" style={{ width: `${Math.round(Number(brandSize) / 8)}px`, objectFit: 'contain' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Work Hours ───────────────────────────────────────────────────────── */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-400" />
          <h2 className="font-semibold text-white text-lg">Work Day Hours</h2>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Used by the Daily View to show the work day progress bar and remaining time.</p>
        <div className="flex items-center gap-6">
          <div className="space-y-1.5">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">Work Start</label>
            <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
              className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
          </div>
          <div className="text-gray-600 mt-5 text-xl">→</div>
          <div className="space-y-1.5">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">Work End</label>
            <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)}
              className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] focus:border-blue-500 text-white px-3 py-2 rounded-lg text-sm outline-none" />
          </div>
          <div className="mt-5 text-sm text-[hsl(var(--muted-foreground))]">
            {(() => {
              const [sh, sm] = workStart.split(':').map(Number);
              const [eh, em] = workEnd.split(':').map(Number);
              const mins = (eh * 60 + em) - (sh * 60 + sm);
              if (mins <= 0) return '';
              return `${Math.floor(mins / 60)}h ${mins % 60}m work day`;
            })()}
          </div>
        </div>
      </div>

      {/* ── Display Theme ────────────────────────────────────────────────────── */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-400" />
          <h2 className="font-semibold text-white text-lg">Display Theme</h2>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Controls the look of the Daily View and Calendar shown on your displays.</p>

        {/* Preset grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.filter(t => t.id !== 'custom').map(theme => {
            const isActive = activeThemeId === theme.id;
            // Extract first/last color from gradient for swatch
            const swatchA = theme.bgGradient.match(/#[0-9a-fA-F]{6}/g)?.[0] ?? '#000';
            const swatchB = theme.bgGradient.match(/#[0-9a-fA-F]{6}/g)?.[1] ?? swatchA;
            return (
              <button key={theme.id} onClick={() => setActiveThemeId(theme.id)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                  isActive ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:border-white/20'
                }`}>
                {/* Mini preview */}
                <div className="h-20 relative" style={{ background: theme.bgGradient }}>
                  {/* Simulated header bar */}
                  <div className="absolute top-2 left-2 right-2 h-1.5 rounded-full opacity-40"
                    style={{ backgroundColor: theme.accent }} />
                  {/* Simulated event blocks */}
                  <div className="absolute left-5 right-2 rounded-md" style={{
                    top: '28%', height: '20%',
                    backgroundColor: theme.accent + '40',
                    borderLeft: `3px solid ${theme.accent}`,
                  }} />
                  <div className="absolute left-5 right-2 rounded-md" style={{
                    top: '56%', height: '28%',
                    backgroundColor: theme.accent + '25',
                    borderLeft: `3px solid ${theme.accent}80`,
                  }} />
                  {/* Now line */}
                  <div className="absolute left-3 right-0" style={{ top: '50%', borderTop: `1.5px dashed ${theme.nowLine}90` }} />
                  {/* Accent dot */}
                  <div className="absolute w-2 h-2 rounded-full" style={{
                    top: 'calc(50% - 4px)', left: '10px', backgroundColor: theme.accent,
                  }} />
                  {/* Gradient swatch strip */}
                  <div className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(to right, ${swatchA}, ${swatchB})` }} />
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5" style={{ backgroundColor: swatchA }}>
                  <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>{theme.name}</span>
                </div>
              </button>
            );
          })}

          {/* Custom tile */}
          <button onClick={() => setActiveThemeId('custom')}
            className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
              activeThemeId === 'custom' ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-transparent hover:border-white/20'
            }`}>
            <div className="h-20 bg-gradient-to-br from-pink-900/40 via-purple-900/40 to-blue-900/40 flex items-center justify-center">
              <Palette className="w-7 h-7 text-pink-400 opacity-70" />
              {activeThemeId === 'custom' && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="px-2 py-1.5 bg-[hsl(var(--secondary))]">
              <span className="text-xs font-bold text-pink-300">Custom</span>
            </div>
          </button>
        </div>

        {/* Custom color controls — shown only when Custom is selected */}
        {activeThemeId === 'custom' && (
          <div className="border border-pink-500/20 rounded-xl p-4 space-y-4 bg-pink-500/5">
            <div className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-2">Custom Colors</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {(
                [
                  { key: 'bgGradient',    label: 'Background',       type: 'text',  placeholder: 'CSS gradient or color' },
                  { key: 'accent',        label: 'Accent / Now Line', type: 'color', placeholder: '' },
                  { key: 'textPrimary',   label: 'Primary Text',      type: 'color', placeholder: '' },
                  { key: 'textSecondary', label: 'Secondary Text',    type: 'color', placeholder: '' },
                  { key: 'textMuted',     label: 'Muted Text',        type: 'color', placeholder: '' },
                  { key: 'headerBorder',  label: 'Divider Color',     type: 'color', placeholder: '' },
                  { key: 'progressFill',  label: 'Progress Bar Fill', type: 'text',  placeholder: 'CSS gradient or color' },
                  { key: 'gridLine',      label: 'Grid Lines',        type: 'text',  placeholder: 'rgba(255,255,255,0.05)' },
                  { key: 'nowLine',       label: 'Now Line',          type: 'color', placeholder: '' },
                ] as { key: keyof DayTheme; label: string; type: string; placeholder: string }[]
              ).map(({ key, label, type, placeholder }) => {
                const baseTheme = THEMES.find(t => t.id === 'midnight')!;
                const currentVal = (customTheme[key] ?? baseTheme[key]) as string;
                return (
                  <div key={key} className="space-y-1">
                    <label className="text-xs text-[hsl(var(--muted-foreground))]">{label}</label>
                    <div className="flex items-center gap-2">
                      {type === 'color' ? (
                        <>
                          <input type="color" value={currentVal.startsWith('#') ? currentVal : '#60a5fa'}
                            onChange={e => setCustomTheme(p => ({ ...p, [key]: e.target.value }))}
                            className="w-8 h-8 rounded cursor-pointer border border-[hsl(var(--border))] bg-transparent p-0.5" />
                          <input type="text" value={currentVal}
                            onChange={e => setCustomTheme(p => ({ ...p, [key]: e.target.value }))}
                            className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white text-xs px-2 py-1.5 rounded-lg outline-none focus:border-pink-500 font-mono" />
                        </>
                      ) : (
                        <input type="text" value={currentVal} placeholder={placeholder}
                          onChange={e => setCustomTheme(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white text-xs px-2 py-1.5 rounded-lg outline-none focus:border-pink-500 font-mono" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] pt-1">
              Changes preview live on displays after you <strong className="text-white">Save Settings</strong>.
            </div>
          </div>
        )}
      </div>

      {/* ── Device Tools ─────────────────────────────────────────────────────── */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-orange-400" />
            <h2 className="font-semibold text-white text-lg">Device Tools</h2>
          </div>
          <button onClick={loadDevices} className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${devicesLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Global action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => pushAll('reload', 'Force Reload')}
            disabled={!!pushingDevice}
            className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 text-orange-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${pushingDevice === 'all-reload' ? 'animate-spin' : ''}`} />
            Reload All Displays
          </button>
          <button
            onClick={pushSettingsRefresh}
            disabled={!!pushingDevice}
            className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
            <Activity className={`w-4 h-4 ${pushingDevice === 'all-settings' ? 'animate-spin' : ''}`} />
            Push Settings to All
          </button>
        </div>

        {/* Per-device list */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1">
            Connected Devices ({devices.filter(d => d.status === 'active').length} online)
          </div>
          {devicesLoading && devices.length === 0 ? (
            <div className="text-sm text-[hsl(var(--muted-foreground))] py-2">Loading…</div>
          ) : devices.length === 0 ? (
            <div className="text-sm text-[hsl(var(--muted-foreground))] py-2">No devices registered yet.</div>
          ) : (
            devices.map(dev => {
              const isOnline = dev.status === 'active';
              const lastSeen = dev.last_seen ? new Date(dev.last_seen * 1000) : null;
              const secAgo = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 1000) : null;
              const lastSeenLabel = secAgo === null ? 'Never'
                : secAgo < 60 ? `${secAgo}s ago`
                : secAgo < 3600 ? `${Math.floor(secAgo / 60)}m ago`
                : `${Math.floor(secAgo / 3600)}h ago`;

              return (
                <div key={dev.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isOnline
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-white/2 border-[hsl(var(--border))] opacity-60'
                }`}>
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {isOnline
                      ? <Wifi className="w-4 h-4 text-green-400" />
                      : <WifiOff className="w-4 h-4 text-gray-600" />}
                  </div>

                  {/* Device info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{dev.name ?? 'Unnamed Device'}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'
                      }`}>{dev.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        <Monitor className="w-3 h-3 inline mr-1" />{dev.ip_address ?? 'No IP'}
                      </span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        Last seen: {lastSeenLabel}
                      </span>
                      {dev.resolution && (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{dev.resolution}</span>
                      )}
                      {dev.version && (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">v{dev.version}</span>
                      )}
                    </div>
                  </div>

                  {/* Per-device actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => pushDevice(dev.id, 'reload', 'Reload')}
                      disabled={!!pushingDevice || !isOnline}
                      title="Force reload browser"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 disabled:opacity-30 transition-colors">
                      <RefreshCw className={`w-3.5 h-3.5 ${pushingDevice === dev.id + 'reload' ? 'animate-spin' : ''}`} />
                      Reload
                    </button>
                    <button
                      onClick={() => pushDevice(dev.id, 'settings', 'Push Settings')}
                      disabled={!!pushingDevice || !isOnline}
                      title="Push latest settings"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 disabled:opacity-30 transition-colors">
                      <Activity className={`w-3.5 h-3.5 ${pushingDevice === dev.id + 'settings' ? 'animate-spin' : ''}`} />
                      Settings
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Push log / diagnostics */}
        <div>
          <button onClick={() => setShowDiag(v => !v)}
            className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            {showDiag ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span className="font-bold uppercase tracking-widest">Push Log</span>
            {pushLog.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full font-bold ${pushLog[0].ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {pushLog[0].ok ? '✓' : '✗'} {pushLog[0].msg}
              </span>
            )}
          </button>

          {showDiag && (
            <div className="mt-3 bg-[hsl(222,47%,6%)] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              {/* Diagnostic info */}
              <div className="px-4 py-3 border-b border-[hsl(var(--border))] grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[hsl(var(--muted-foreground))] mb-0.5">Server URL</div>
                  <div className="text-white font-mono">{typeof window !== 'undefined' ? window.location.origin : '—'}</div>
                </div>
                <div>
                  <div className="text-[hsl(var(--muted-foreground))] mb-0.5">Settings API</div>
                  <a href="/api/settings" target="_blank" className="text-blue-400 hover:underline font-mono">/api/settings ↗</a>
                </div>
                <div>
                  <div className="text-[hsl(var(--muted-foreground))] mb-0.5">Devices API</div>
                  <a href="/api/devices" target="_blank" className="text-blue-400 hover:underline font-mono">/api/devices ↗</a>
                </div>
                <div>
                  <div className="text-[hsl(var(--muted-foreground))] mb-0.5">Total Devices</div>
                  <div className="text-white">{devices.length}</div>
                </div>
                <div>
                  <div className="text-[hsl(var(--muted-foreground))] mb-0.5">Online</div>
                  <div className="text-green-400">{devices.filter(d => d.status === 'active').length}</div>
                </div>
                <div>
                  <div className="text-[hsl(var(--muted-foreground))] mb-0.5">Offline</div>
                  <div className="text-red-400">{devices.filter(d => d.status !== 'active').length}</div>
                </div>
              </div>
              {/* Log entries */}
              {pushLog.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">No actions yet. Use the buttons above to push commands to devices.</div>
              ) : (
                <div className="divide-y divide-[hsl(var(--border))] max-h-48 overflow-y-auto">
                  {pushLog.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                      <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                        entry.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>{entry.ok ? '✓' : '✗'}</span>
                      <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] flex-shrink-0">{entry.time}</span>
                      <span className={`text-xs ${entry.ok ? 'text-white' : 'text-red-400'}`}>{entry.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Pi Setup heading ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Pi Setup</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Instructions for setting up Raspberry Pi Zero 2W as a display client</p>
      </div>

      {/* Quick start */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-white flex items-center gap-2"><Terminal className="w-5 h-5 text-blue-400" /> Quick Start (One Command)</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Run this on your Pi Zero 2W — it installs everything and registers the device automatically:</p>
        <CodeBlock code={`curl -sL ${serverUrl}/api/pi-setup | bash`} id="quick" />
      </div>

      {/* What it does */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white">What the Setup Script Does</h2>
        <ul className="space-y-2">
          {[
            'Installs Chromium, X11, and unclutter',
            'Registers the Pi with this server and gets a 6-digit pairing code',
            'Configures auto-login and auto-start X on boot',
            'Launches Chromium in kiosk mode pointed at the pairing screen',
            'Enables remote debugging port (9222) for server-side screenshots',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Manual script */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Full Setup Script (Manual)</h2>
          <button onClick={() => {
            const blob = new Blob([setupScript], { type: 'text/plain' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'pisignage-setup.sh'; a.click();
          }} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
            <Download className="w-4 h-4" /> Download .sh
          </button>
        </div>
        <CodeBlock code={setupScript} id="script" />
      </div>

      {/* Requirements */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-white">Server Requirements</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Node.js', value: '≥ 18.x' },
            { label: 'ffmpeg', value: 'For video transcoding' },
            { label: 'yt-dlp', value: 'pip3 install yt-dlp' },
            { label: 'pm2', value: 'npm install -g pm2' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[hsl(var(--muted-foreground))]">{label}:</span>
              <code className="text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded text-xs">{value}</code>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">Start the server with pm2:</p>
          <CodeBlock code={`npm install\nnpm run build\npm2 start npm --name pisignage -- start\npm2 save && pm2 startup`} id="pm2" />
        </div>
      </div>

      {/* Server URL */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-2">
        <h2 className="font-semibold text-white">Your Server URL</h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-green-400 px-3 py-2 rounded-lg text-sm font-mono">{serverUrl}</code>
          <button onClick={() => copy(serverUrl, 'url')} className="flex items-center gap-1.5 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
            {copied === 'url' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Make sure your Pi can reach this URL on the network. Use your server&apos;s local IP address for LAN-only setups.</p>
      </div>
    </div>
  );
}
