# Cloudflare Setup — Harvest Valley

## Quick Start

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Run Setup Script
```bash
npm run deploy:setup
```

This will:
- Create D1 database
- Create R2 bucket
- Create KV namespace
- Run database migrations
- Upload all 3D assets to R2

### 3. Configure
Edit `wrangler.toml` with your values:
- `WALLET_ADDRESS` — Your USDT wallet
- `WALLET_NETWORK` — Network (e.g., "USDT (TRC20)")
- `TELEGRAM` — Your Telegram username

### 4. Get R2 Public URL
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 → `harvest-valley-assets` → Settings
3. Enable Public Access
4. Copy the public URL (e.g., `https://pub-xxxxx.r2.dev`)

### 5. Set R2 URL
Create `.env` in project root:
```
VITE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### 6. Run Locally
```bash
npm run dev:full
```

### 7. Deploy
```bash
npm run deploy
```

## Architecture

| Service | Purpose |
|---------|---------|
| **Cloudflare Pages** | Frontend (React + Three.js) |
| **Cloudflare Workers** | API backend (deposits) |
| **Cloudflare D1** | Database (deposits table) |
| **Cloudflare R2** | 3D assets (GLB models, Draco WASM) |
| **Cloudflare KV** | Config cache (wallet, network, telegram) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/deposit/config` | Get wallet/network/telegram config |
| GET | `/api/deposits/player/:name` | Get player deposit history |
| POST | `/api/admin/deposits` | Confirm a deposit (admin) |
| GET | `/api/admin/deposits` | List recent deposits (admin) |
| GET | `/api/admin/player/:name` | Get player summary (admin) |

## Local Development

The project supports local development with Wrangler:

```bash
# Start both Vite dev server and Wrangler worker
npm run dev:full
```

This runs:
- Vite on `http://localhost:5174`
- Wrangler worker on `http://localhost:8787`

The Vite dev server proxies `/api` requests to the worker.

## Troubleshooting

### "Cannot find module" errors
Run: `npm install`

### D1 database not found
Run: `npm run db:init`

### Assets not loading
Check that `VITE_R2_PUBLIC_URL` is set correctly in `.env`

### Worker not responding
Run: `wrangler dev` separately and check logs
