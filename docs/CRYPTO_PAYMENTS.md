# 💎 Crypto Payments (NOWPayments)

Sistema de pago con criptomonedas para comprar diamantes en Harvest Valley.

## Architecture

```
Frontend (Vite :5174)  →  Proxy /api/*  →  Backend (Express :3001)  →  NOWPayments API
                                                        ↕
                                                  SQLite (data/harvest-valley.db)
                                                        ↕
                                              NOWPayments Hosted Payment Page
```

## Quick Start

```bash
# 1. Install backend dependencies
cd server && npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — add your NOWPayments API key

# 3. Start backend
npm run dev    # http://localhost:3001

# 4. Start frontend (separate terminal)
cd .. && npm run dev   # http://localhost:5174
```

## Payment Flow

1. Player clicks "+" next to diamonds → opens `DiamondPurchaseModal`
2. Selects package → selects cryptocurrency (BTC, ETH, USDT, etc.)
3. Frontend calls `POST /api/payments/crypto/create`
4. Backend creates NOWPayments invoice → returns `paymentUrl`
5. **NOWPayments hosted payment page opens in new tab** (QR code, address, instructions — all handled by NOWPayments)
6. Frontend shows "waiting for payment" screen, polls status every 5s
7. Player pays on NOWPayments page → NOWPayments sends IPN webhook
8. Backend credits diamonds on `finished` status
9. Frontend detects status change → shows success

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/payments/currencies` | Available cryptocurrencies |
| `POST` | `/api/payments/crypto/create` | Create invoice → returns paymentUrl |
| `GET` | `/api/payments/crypto/:id` | Get payment status (poll this) |
| `POST` | `/api/payments/nowpayments/ipn` | NOWPayments webhook (IPN) |
| `GET` | `/api/payments/history?userId=x` | Payment history |
| `GET` | `/api/payments/balance?userId=x` | Diamond balance |
| `GET` | `/api/health` | Health check |

### Create Payment

```bash
POST /api/payments/crypto/create
Content-Type: application/json

{ "userId": "player1", "packageId": "initial", "payCurrency": "btc" }
```

Response:
```json
{
  "paymentId": "HV-DIAMONDS-...",
  "invoiceId": "5802492238",
  "paymentUrl": "https://nowpayments.io/payment/?iid=5802492238&source=button",
  "status": "waiting",
  "priceUsd": 0.99,
  "diamonds": 80,
  "payCurrency": "btc",
  "sandbox": true
}
```

The `paymentUrl` is the NOWPayments hosted page where the player pays.

## Diamond Packages

| ID | Diamonds | USD |
|----|----------|-----|
| `initial` | 80 | $0.99 |
| `basic` | 420 | $4.99 |
| `farmer` | 900 | $9.99 |
| `big` | 2,000 | $19.99 |
| `premium` | 5,500 | $49.99 |
| `mega` | 12,000 | $99.99 |

## NOWPayments Setup

1. Create account at https://admin.nowpayments.io/
2. Get API key from Dashboard → API Keys
3. Set IPN callback URL: `https://your-domain.com/api/payments/nowpayments/ipn`
4. Copy API key and IPN secret to `server/.env`

### Sandbox vs Production

- `NOWPAYMENTS_SANDBOX=true` — test mode, no real charges
- `NOWPAYMENTS_SANDBOX=false` — real payments

When no API key is set, the backend uses mock invoice data for testing.

## Frontend Components

- **`diamondStore.ts`** — manages payment state, API calls, status polling
- **`DiamondPurchaseModal.tsx`** — multi-step modal:
  1. **Packages** — 6 cards with badges
  2. **Crypto Select** — 7 cryptocurrency options
  3. **Waiting** — status display, "Open payment page" button (opens NOWPayments)
  4. **Success/Failed** — confirmation screens

## Security

- Package prices validated server-side from DB (not client-trusted)
- IPN signature verification via HMAC-SHA512
- Idempotent webhook processing (won't double-credit)
- API keys stored in server `.env`, never exposed to frontend
- NOWPayments handles all payment UI/address/QR securely

## Files

```
server/
  index.js                         # Express server entry
  db.js                            # SQLite (sql.js WASM)
  .env / .env.example              # Configuration
  routes/payments.js               # All payment API routes
  services/nowpayments.js           # NOWPayments API client

src/
  store/diamondStore.ts             # Frontend payment state
  ui/store/DiamondPurchaseModal.tsx  # Payment modal UI
  config/economy.ts                 # Package definitions
  locales/es.json / en.json         # i18n keys (diamond.*)
```
