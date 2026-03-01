<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-green?style=for-the-badge&logo=sqlite" />
  <img src="https://img.shields.io/badge/Raspberry_Pi-Zero_2W-red?style=for-the-badge&logo=raspberry-pi" />
  <img src="https://img.shields.io/badge/TailwindCSS-v3-38bdf8?style=for-the-badge&logo=tailwindcss" />
</p>

<h1 align="center">🖥️ PiSignage Pro</h1>

<p align="center">
  <strong>Self-hosted digital signage platform for Raspberry Pi Zero 2W displays.</strong><br/>
  Manage unlimited screens from a single Ubuntu server. Real-time push via SSE, per-device playlists, schedules, announcements, and YouTube downloads — all in a beautiful dark UI.
</p>

---

## ✨ Features

- **Multi-device management** — adopt, name, assign location, track online/offline status
- **Device pairing flow** — Pi generates a 6-digit code shown on screen; admin clicks Adopt
- **Per-device playlists** — each display can run an independent playlist
- **Asset library** — images, videos, web URLs, text/HTML, clock widget, YouTube (auto-downloaded via yt-dlp)
- **Playlist builder** — drag-and-reorder items, per-asset duration override, loop/shuffle
- **Scheduler** — day-of-week rules with time ranges per device
- **Announcements** — scrolling ticker overlay pushed to devices instantly via SSE
- **Real-time push** — Server-Sent Events (SSE) stream to each Pi; no polling required
- **YouTube downloads** — paste a URL and the server downloads/transcodes via yt-dlp + ffmpeg
- **Pi setup in one command** — `curl | bash` script handles everything on the Pi side

---

## 📐 Architecture

```
Ubuntu Server (Next.js 14)
  ├── Admin UI        http://SERVER_IP:3000/admin
  ├── API routes      http://SERVER_IP:3000/api/...
  └── SSE streams     http://SERVER_IP:3000/api/devices/:id/stream

Raspberry Pi Zero 2W (Chromium kiosk)
  ├── First boot      http://SERVER_IP:3000/pair/:code
  └── After adoption  http://SERVER_IP:3000/display/:deviceId
```

The Pi is a **dumb client** — it only runs Chromium in kiosk mode pointed at the server. All logic lives on the server.

---

## 🖥️ Part 1 — Server Setup (Ubuntu)

### Prerequisites

You need a machine (Ubuntu 20.04 / 22.04 / 24.04) that your Pi(s) can reach on the network. This can be a dedicated server, a VM, an old laptop, or even a Raspberry Pi 4/5.

### Step 1 — Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should show v20.x.x
```

### Step 2 — Install ffmpeg and yt-dlp

Required for YouTube video downloads and video duration detection.

```bash
sudo apt-get install -y ffmpeg
sudo pip3 install yt-dlp
# or without pip3:
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

Verify:
```bash
ffmpeg -version | head -1
yt-dlp --version
```

### Step 3 — Install pm2 (process manager)

```bash
sudo npm install -g pm2
```

### Step 4 — Clone and install PiSignage Pro

```bash
git clone https://github.com/neilyboy/pisignage-pro.git
cd pisignage-pro
npm install
```

### Step 5 — Build the app

```bash
npm run build
```

You should see output ending with something like:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    146 B          87.5 kB
├ ○ /admin                               2.35 kB        107 kB
...
✓ Generating static pages (13/13)
```

### Step 6 — Start with pm2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

### Step 7 — Verify it's running

```bash
pm2 status
curl http://localhost:3000/api/stats/summary
# Should return: {"totalDevices":0,"activeDevsets":0,...}
```

Open **http://YOUR_SERVER_IP:3000** in a browser — you should see the PiSignage Pro admin dashboard.

---

### 🔒 Optional: Set Up Nginx Reverse Proxy

If you want to run on port 80/443 or use a domain name:

```bash
sudo apt-get install -y nginx

sudo tee /etc/nginx/sites-available/pisignage << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        # Required for SSE (Server-Sent Events)
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/pisignage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

> ⚠️ **Important for SSE:** The `proxy_buffering off` and `proxy_read_timeout 86400` lines are required. Without them, real-time push to displays will not work through nginx.

---

### 🔥 Optional: Open Firewall Port

If you're using `ufw`:

```bash
sudo ufw allow 3000/tcp    # direct Node access
sudo ufw allow 80/tcp      # nginx HTTP
sudo ufw allow 443/tcp     # nginx HTTPS (if using SSL)
sudo ufw reload
```

---

## 🍓 Part 2 — Raspberry Pi Zero 2W Setup

### Requirements

- Raspberry Pi Zero 2W
- MicroSD card (8GB+ recommended)
- Raspberry Pi OS Lite (64-bit) **or** Raspberry Pi OS Desktop
- HDMI display connected
- Internet access (Wi-Fi configured)

### Step 1 — Flash the Pi

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Choose: **Raspberry Pi Zero 2 W** → **Raspberry Pi OS Lite (64-bit)**
3. Click the ⚙️ gear icon and configure:
   - ✅ Set hostname (e.g. `display-lobby`)
   - ✅ Enable SSH
   - ✅ Set username/password (e.g. `pi` / your password)
   - ✅ Configure Wi-Fi (SSID + password)
   - ✅ Set locale/timezone
4. Flash to SD card, insert into Pi, power on

### Step 2 — SSH into the Pi

```bash
ssh pi@display-lobby.local
# or use the IP address if hostname doesn't resolve
```

### Step 3 — Run the one-command setup

```bash
curl -sL http://YOUR_SERVER_IP:3000/api/pi-setup | bash
```

Replace `YOUR_SERVER_IP` with your server's local IP address (e.g. `192.168.1.100`).

**What this script does:**
1. Updates package lists and installs Chromium browser, X11, and unclutter (hides mouse cursor)
2. Registers the Pi with your PiSignage Pro server and receives a unique device ID + 6-digit pairing code
3. Creates `~/.xinitrc` to launch Chromium in kiosk mode with `--remote-debugging-port=9222`
4. Configures auto-login on `tty1`
5. Configures auto-start of X11 on login
6. The Pi will reboot when done (you can cancel the reboot if needed)

### Step 4 — Note the pairing code

At the end of the script, you'll see:
```
=============================================
  PiSignage Pro Setup Complete!

  Pairing Code: 754980

  Next steps:
  1. Reboot this Pi
  2. Go to: http://192.168.1.100:3000/admin/devices
  3. Find 'Pending Adoption' and click 'Adopt Device'
=============================================
```

### Step 5 — Adopt the device from the admin panel

1. Open **http://YOUR_SERVER_IP:3000/admin/devices** in your browser
2. You'll see the device under **"Pending Adoption"**
3. Click **Adopt Device**, enter a name (e.g. "Lobby Display") and optional location
4. Click **Confirm Adoption**

The Pi will automatically navigate from the pairing screen to the display page within ~5 seconds.

### Step 6 — Assign a playlist and go!

1. Go to **Media Library** → upload some images or add a YouTube URL
2. Go to **Playlists** → create a new playlist and add your assets
3. Go to **Devices** → click your device → **Push Playlist**
4. The display updates instantly 🎉

---

## 📖 Admin Panel Walkthrough

### Dashboard (`/admin`)
Overview of all devices (online/offline counts), total assets, playlists, and schedules. Shows a live device list with last-seen timestamps.

### Devices (`/admin/devices`)
- **Pending Adoption** section shows newly registered Pis waiting to be named
- **Active Devices** shows all adopted displays with online/offline status
- Click any device to open its detail page

### Device Detail (`/admin/devices/[id]`)
- Edit name, location, notes
- Set brightness (sent to device via SSE)
- Set orientation (landscape/portrait)
- Assign a default playlist
- Push playlist/announcement/reload commands directly

### Media Library (`/admin/media`)
- **Upload** images and videos by clicking "Upload File" or drag-and-drop
- **YouTube** — paste a YouTube URL in the red bar and click "Download". The server downloads the video via `yt-dlp` and transcodes it in the background. Refresh after ~1 minute for longer videos.
- **Add Asset** — manually add web URLs, text overlays, HTML content, or clock widgets
- Assets can be filtered by type and searched by name

### Playlists (`/admin/playlists`)
- Create playlists in the left panel
- Select a playlist to edit it on the right
- Click assets in the right panel to add them to the playlist
- Drag items by the ⋮⋮ handle to reorder
- Set per-item duration (overrides the asset default)
- Toggle **Loop** and **Shuffle**
- Click **Save Playlist** to persist changes

### Schedule (`/admin/schedule`)
- Create schedules that say "on device X, play playlist Y between HH:MM and HH:MM on these days"
- Leave device empty to apply to all devices
- Days of week toggle (Sun–Sat)
- Active toggle to enable/disable without deleting

### Announcements (`/admin/announcements`)
- Create scrolling text tickers with custom text/background colors
- Live color preview in the modal
- Scroll speed slider
- Target specific devices or send to all
- Toggle active/inactive per announcement — toggling to active re-pushes to devices instantly

### Analytics (`/admin/analytics`)
- Real-time device status grid (auto-refreshes every 10 seconds)
- Online/offline with last-seen time
- Summary counts for all content

### Settings (`/admin/settings`)
- Copy the one-command Pi setup script (with your server URL pre-filled)
- Download the full setup `.sh` script
- Server requirements checklist with install commands

---

## 🖥️ Display Page (`/display/:deviceId`)

This is what the Pi displays in kiosk mode. It:
- Connects to the SSE stream for real-time commands
- Sends a heartbeat to the server every 30 seconds
- Cycles through all playlist items with smooth fade transitions
- Renders:
  - **Images** — with configurable fit (cover/contain/stretch)
  - **Videos** — auto-plays, muted by default, loops
  - **Web URLs** — rendered in a full-screen iframe
  - **Text** — centered, large white text on dark background
  - **HTML** — raw HTML rendered via srcdoc iframe
  - **Clock** — live full-screen clock widget with date
- Overlays announcement tickers at the bottom of the screen

---

## 🎬 Asset Types Reference

| Type | Description | Example |
|------|-------------|---------|
| `image` | JPEG, PNG, GIF, WebP | Logo, promotion poster |
| `video` | MP4, WebM | Commercial, demo video |
| `youtube` | Auto-downloaded as MP4 via yt-dlp | YouTube tutorial |
| `webpage` | Displayed in iframe | Live dashboard, weather |
| `text` | Centered text overlay | "Welcome", "Closed today" |
| `html` | Raw HTML/CSS content | Custom layout |
| `clock` | Live clock + date widget | Lobby display |

---

## 🔧 Troubleshooting

### Pi shows pairing code but never auto-navigates after adoption
The Pi polls every 5 seconds. If it doesn't navigate, SSH in and check:
```bash
curl http://YOUR_SERVER_IP:3000/api/devices/pair?code=XXXXXX
```
Should return `{"adopted":true,"id":"...","name":"..."}`.

### Pi boots to black screen / no display
```bash
ssh pi@YOUR_PI_IP
cat ~/.startx.log
# Look for X11 or Chromium errors
```

Common fix — check if Chromium is installed:
```bash
which chromium-browser
# If missing: sudo apt-get install -y chromium-browser
```

### YouTube download stuck in "Downloading..."
Check if yt-dlp is installed on the server:
```bash
which yt-dlp
yt-dlp --version
```
Check server logs:
```bash
pm2 logs pisignage --lines 50
```

### Announcements not showing on display
Make sure the SSE stream is connected. Check browser console on the display page for EventSource errors. If using nginx, ensure `proxy_buffering off` is set (see nginx section above).

### API routes return 404 in production
Make sure you ran `npm run build` and restarted pm2 after any code changes:
```bash
npm run build && pm2 restart pisignage
```

### Database reset (start fresh)
```bash
pm2 stop pisignage
rm data/pisignage.db
pm2 start pisignage
```
This deletes all devices, assets, playlists, etc. The database recreates automatically on next start.

### Device shows wrong time on clock widget
The display page uses the browser's local time, which is the Pi's system time. Fix on the Pi:
```bash
sudo timedatectl set-timezone America/Chicago   # replace with your timezone
sudo timedatectl set-ntp true
```

---

## 📁 Project Structure

```
pisignage-pro/
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # Sidebar nav
│   │   ├── page.tsx            # Dashboard
│   │   ├── devices/
│   │   │   ├── page.tsx        # Device list + adoption
│   │   │   └── [id]/page.tsx   # Device detail + push
│   │   ├── media/page.tsx      # Asset library
│   │   ├── playlists/page.tsx  # Playlist builder
│   │   ├── schedule/page.tsx   # Schedule manager
│   │   ├── announcements/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx   # Pi setup docs
│   ├── api/
│   │   ├── devices/            # CRUD + heartbeat + SSE + push + pair
│   │   ├── assets/             # CRUD
│   │   ├── upload/             # File upload handler
│   │   ├── youtube/            # yt-dlp download
│   │   ├── playlists/          # CRUD with items
│   │   ├── schedules/          # CRUD
│   │   ├── announcements/      # CRUD + SSE push
│   │   ├── stats/summary/      # Dashboard stats
│   │   └── pi-setup/           # Bash setup script
│   ├── display/[deviceId]/     # Kiosk output page
│   └── pair/[code]/            # Pi pairing screen
├── lib/
│   ├── db.ts                   # SQLite init + schema
│   ├── sse.ts                  # SSE client manager
│   ├── types.ts                # TypeScript interfaces
│   └── utils.ts                # Helpers (generateId, timeAgo, etc.)
├── public/uploads/             # Uploaded + downloaded media files
├── data/pisignage.db           # SQLite database (auto-created)
├── ecosystem.config.js         # pm2 config
└── next.config.mjs
```

---

## 🚀 Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` → http://localhost:3010 |
| Build for production | `npm run build` |
| Start production (pm2) | `pm2 start ecosystem.config.js` |
| Stop production | `pm2 stop pisignage` |
| Restart after code change | `npm run build && pm2 restart pisignage` |
| View logs | `pm2 logs pisignage` |
| Setup new Pi | `curl -sL http://SERVER_IP:3000/api/pi-setup \| bash` |

---

## 🛠️ Development

```bash
git clone https://github.com/neilyboy/pisignage-pro.git
cd pisignage-pro
npm install
npm run dev
# Open http://localhost:3010
```

The dev server hot-reloads on code changes. The SQLite database auto-creates at `data/pisignage.db` on first run.

---

## 📝 License

MIT — free to use, modify, and deploy.

---

<p align="center">Built with ❤️ for Raspberry Pi signage nerds everywhere.</p>
