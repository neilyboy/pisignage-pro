'use client';
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, Download, Upload, Image as ImageIcon, Clock, Save } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      setBrandEnabled(s.brand_enabled === 'true');
      setBrandLogoUrl(s.brand_logo_url ?? '');
      setBrandPosition(s.brand_position ?? 'bottom-right');
      setBrandSize(s.brand_size ?? '120');
      setWorkStart(s.work_start ?? '08:00');
      setWorkEnd(s.work_end ?? '17:00');
    });
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
