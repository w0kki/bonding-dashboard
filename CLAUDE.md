# bonding-dashboard — Claude Code Reference

## What this project is

A read-only signal dashboard for [Polymarket](https://polymarket.com) prediction markets. It scans for markets where one outcome is near certainty (configurable probability threshold) and closing soon — "bonding" opportunities where prices converge to 100¢.

**Signal dashboard only** — no wallet, no trading, no order placement.

---

## Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite` plugin, no config file) |
| Data source | Polymarket Gamma API + CLOB API (public, no auth) |
| State persistence | `localStorage` |
| Node requirement | Node.js ≥ 18 |

---

## Dev commands

```bash
npm install        # first-time setup
npm run dev        # start dev server at http://localhost:5173
npm run build      # tsc + vite build → dist/
npm run lint       # eslint check
npm run preview    # preview production build locally
```

---

## Project layout

```
src/
  App.tsx               — Root: state, localStorage persistence, layout, sorting/filtering
  types.ts              — BondingMarket, SortField, SortDirection, ViewMode, TimeHorizon
  index.css             — Tailwind v4 entry + custom @keyframes (spin, flash-update, fade-in, spin-3d)
  lib/
    polymarket.ts       — ALL data fetching, filtering, and CLOB verification (most important file)
    format.ts           — Pure display helpers: formatTimeRemaining, formatVolume, probabilityColor, spreadColor, …
  components/
    FilterBar.tsx       — All controls: threshold (preset + custom input), horizon, tags, sort (primary + secondary), view mode, auto-refresh, Include Live
    SearchBar.tsx       — Full-text search (press / to focus)
    MarketGrid.tsx      — Switches between table and card view; empty-state
    MarketTable.tsx     — Sortable table with clickable rows
    MarketCard.tsx      — Card tile for grid view
    YfmLogo.tsx         — SVG logo (doubles as loading spinner via animate-spin-3d)
vite.config.ts          — Vite plugins + dev-server API proxies
public/
  favicon.svg
```

---

## Core data flow (`src/lib/polymarket.ts`)

Two-phase pipeline:

### Phase 1 — Gamma API fetch + pre-filter
- `fetchEventsInHorizon(horizonHours)` — paginates `GET /events` with:
  - `active=true`, `closed=false`
  - `end_date_min = now − 3h` (catches live games running past scheduled end time)
  - `end_date_max = now + horizonHours`
- For each market in each event:
  - Skip if `!enableOrderBook`
  - Detect live games: `isLive = (m.acceptingOrders === false)`
  - Date-only `endDateIso` (e.g. `"2026-03-21"`) → appended `T23:59:59Z` (UTC, not local — don't change this)
  - Filter by `timeRemaining` vs `horizonMs` (live markets get a −3h grace window if `includeLive` is on)
  - Find dominant outcome (highest `outcomePrices` entry) → `dominantIdx`, `dominantTokenId`
  - Skip if `maxPrice < threshold/100`
  - Skip if `volumeNum <= 0`

### Phase 2 — CLOB order book verification
- `getTokensWithAsks(tokenIds)` — batches all dominant token IDs into `POST /books`
  - Returns `{ asks: Set<string>, clobAvailable: boolean }`
  - **If CLOB returns 403 (e.g. Pi's IP is blocked)** → `clobAvailable = false` → all candidates pass (graceful degradation)
  - Filters out tokens where no one is selling (empty `asks` array = can't buy in)
- Final filter: `c.isLive || !clobAvailable || tokensWithAsks.has(c.dominantTokenId)`

### Why `bestAsk` from Gamma isn't enough
Gamma's `bestBid`/`bestAsk` only reflect `clobTokenIds[0]` (the Yes token). When that token has no asks, Gamma reports `bestAsk = 1` (a sentinel). The only reliable check is raw `POST /books`.

---

## API proxies (dev only)

Configured in `vite.config.ts`. Only active during `npm run dev`.

| Local path | Proxied to |
|-----------|------------|
| `/api/gamma` | `https://gamma-api.polymarket.com` |
| `/api/clob` | `https://clob.polymarket.com` |

In production/`NODE_ENV=production` the code hits the real URLs directly (no proxy). **Running with `NODE_ENV=production` on the Pi caused a blank page because Vite serves only the static `dist/` folder — always run with `npm run dev` or keep `NODE_ENV=development`.**

---

## Tag filtering (App.tsx)

Markets are bucketed into four display tags: `Crypto`, `Politics`, `Sports`, `Other`.

`bucketFor()` maps Polymarket's sport-specific event tags (Soccer, NFL, NBA, NHL, etc.) to the `Sports` bucket — Polymarket almost never uses a generic "Sports" tag. The full list of recognized sports subtags is in `SPORTS_SUBTAGS` in `App.tsx`.

**If live sports games are missing:** first check that "Sports" is checked in the Tags dropdown (not filtered out).

---

## localStorage keys (all settings are sticky)

| Key | Type | Default |
|-----|------|---------|
| `threshold` | number | 95 |
| `horizon` | 24 \| 48 \| 168 | 48 |
| `sortField` | SortField | `'probability'` |
| `sortDir` | SortDirection | `'desc'` |
| `sortField2` | SortField \| `'none'` | `'none'` |
| `sortDir2` | SortDirection | `'asc'` |
| `viewMode` | `'table'` \| `'card'` | `'table'` |
| `autoRefresh` | boolean | true |
| `includeLive` | boolean | false |
| `excludedTags` | string[] | `[]` |

---

## Market link opener

Clicking a market row/card calls `fetch('http://localhost:3333/open?url=...')` first, which triggers the system default browser via a local Python helper server. Falls back to `window.open` if the server isn't running.

### Python opener server (`~/Library/Scripts/polymarket-opener.py`)
- Listens on `127.0.0.1:3333`
- `GET /open?url=https://polymarket.com/...` → `subprocess.Popen(['open', url])`
- Only accepts `https://polymarket.com` URLs (403 otherwise)
- Auto-started on Mac login via `~/Library/LaunchAgents/com.bonding.opener.plist`

---

## Deployment — Raspberry Pi 5

### Service

File: `/etc/systemd/system/bonding-dashboard.service`

```ini
[Unit]
Description=Bonding Dashboard
After=network.target

[Service]
WorkingDirectory=/home/pi/Desktop/hyperliquid_funding/bonding-dashboard
ExecStart=/usr/bin/npm run dev -- --host
Environment=NODE_ENV=development
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable bonding-dashboard
sudo systemctl start bonding-dashboard
sudo systemctl status bonding-dashboard
```

**`NODE_ENV=development` is required.** The `--host` flag exposes the dev server on the Pi's LAN IP so you can reach it from other devices.

### Accessing from Mac

Pi LAN IP: `10.0.1.225` → `http://10.0.1.225:5173`

The desktop widget (`~/Desktop/Dashboards.app`) opens Safari to this URL automatically.

### Updating the Pi

```bash
ssh pi@10.0.1.225
cd ~/Desktop/hyperliquid_funding/bonding-dashboard
git pull origin beta
npm install        # only needed if package.json changed
pkill -f vite      # systemd Restart=always brings it back
```

Or use `~/update-dashboard.sh` on the Pi.

---

## Git setup

- **Fork**: `https://github.com/w0kki/bonding-dashboard`
- **Branch**: `beta`
- **Mac remote**: HTTPS (`https://github.com/w0kki/bonding-dashboard.git`)
- **Pi remote**: SSH (`git@github.com:w0kki/bonding-dashboard.git`) — uses SSH key deployed on Pi

Workflow:
1. Make changes on Mac
2. `git add`, `git commit`, `git push origin beta`
3. SSH to Pi and `git pull origin beta`

---

## Known gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| 0 markets showing on Pi | `clob.polymarket.com` returns 403 from Pi's IP | CLOB failure is now graceful — markets show without CLOB verification |
| Live sports not showing | Sport-specific tags (Soccer, NFL…) bucketed as "Other" | `SPORTS_SUBTAGS` in `App.tsx` maps them to Sports bucket |
| Date-only endDate markets disappear too early | Treating `"2026-03-21"` as midnight UTC | Appended as `T23:59:59Z` — markets stay until EOD UTC |
| Live games past scheduled end time missing | `end_date_min` was `now`, so expired end times excluded | `end_date_min = now − 3h` |
| Blank page after deploy | `NODE_ENV=production` — Vite only serves `dist/` | Always run with `NODE_ENV=development` on Pi |
| NordVPN in Brave blocks Pi IP | VPN routes traffic away from LAN | Use Safari (not Brave) or add Pi to VPN exclusions |
