# ML Backend Handoff — Sovereign Analytics
### For: Frontend Teammate · From: Adi · Last Updated: April 2026

---

## Overview

Hey! So I've added a second backend server to the Sovereign Analytics project. It's a Python FastAPI app that powers **AI-driven Forex risk simulation** — think of it as a specialist ML microservice that lives alongside our existing Express server.

Here's what it does in one sentence: it takes a user's trade parameters (balance, lot size, leverage), looks at 7 years of EUR/USD historical price data, and uses a neural network + statistical simulation to tell them **how likely they are to get a margin call**.

Under the hood it runs:
1. An **LSTM neural network** (the same type used in Google Translate and financial forecasting tools) trained on 7 years of EUR/USD daily data
2. A **Monte Carlo simulation** that generates 10,000 possible market outcomes to produce a probability distribution

This server runs on **port 8000** separately from the existing Express backend. The React frontend needs to call both.

---

## Architecture Diagram

```
                    ┌───────────────────────────┐
                    │      React Frontend        │
                    └────────────┬──────────────┘
                                 │
               ┌─────────────────┴──────────────────┐
               │                                    │
               ▼                                    ▼
  ┌────────────────────────┐       ┌────────────────────────────┐
  │   Express Backend      │       │  Python FastAPI (port 8000) │
  │   (existing app)       │       │     ── ML Risk Engine ──    │
  └───────────┬────────────┘       └──────────────┬─────────────┘
              │                                   │
              └─────────────────┬─────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   PostgreSQL Database  │
                    │    (shared instance)   │
                    └───────────────────────┘
```

The PostgreSQL database is **shared** — both backends read from the same instance. The ML engine has its own tables (`lstm_features`, `news`, `pair_daily_rates`) that Adi has already seeded and prepared.

---

## What Adi's Backend Does (Plain English)

You don't need to understand any ML to integrate this. Here's what happens when you call `/simulate-risk`:

1. The server pulls the **last 60 days of real EUR/USD closing prices** from the shared PostgreSQL database.
2. It feeds those 60 days into a trained neural network (LSTM) which **predicts the expected pip movement for tomorrow** — e.g. "the model thinks price will move about +2.3 pips upward."
3. It then runs a **Monte Carlo simulation**: using that expected drift and current market volatility, it simulates 10,000 possible "what could happen tomorrow" scenarios.
4. It counts how many of those 10,000 scenarios would **blow past the user's margin call threshold** given their trade size. If 8,000 out of 10,000 scenarios hit the threshold, `margin_call_probability` = 0.80 (80%).
5. It packages all of this into a clean JSON response including 200 sampled paths for you to chart.

The whole thing runs in under a second on CPU.

---

## API Reference

**Base URL:** `http://localhost:8000`

---

### `GET /health`

Use this to check if the ML server is alive before making any simulation calls. Call this on page load.

**Request:** No body, no headers needed.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "pair": "EURUSD"
}
```

If this request fails entirely (network error / connection refused), the ML server is not running.

---

### `POST /simulate-risk`

The main simulation endpoint. Send trade parameters, receive full risk analysis.

**Request Body:**
```json
{
  "account_balance": 10000,
  "lot_size": 1.0,
  "leverage": 100,
  "pair_id": "EURUSD"
}
```

| Field | Type | Description |
|---|---|---|
| `account_balance` | `number` | User's account equity in USD |
| `lot_size` | `number` | Trade size in standard lots (1 lot = 100,000 units) |
| `leverage` | `integer` | Broker leverage ratio (e.g. `100` = 1:100 leverage) |
| `pair_id` | `string` | Currency pair — only `"EURUSD"` is supported right now |

**Response:**

```json
{
  "pair_id": "EURUSD",
  "predicted_pip_move": 2.344,
  "margin_call_probability": 0.9299,
  "margin_call_threshold_pips": 17.34,
  "pip_value_per_pip": 10.0,
  "margin_required": 1173.43,
  "risk_status": "HIGH",
  "sampled_paths": [14.26, 6.01, -5.29, 2.48, ...],
  "n_paths_simulated": 10000,
  "sigma_used": 10.2715,
  "current_close": 1.17343
}
```

| Field | Type | Description |
|---|---|---|
| `predicted_pip_move` | `number` | The LSTM model's predicted next-day pip movement (can be positive or negative) |
| `margin_call_probability` | `number` | Probability of a margin call — float between 0 and 1. **This is your headline number.** Multiply by 100 for a percentage. |
| `margin_call_threshold_pips` | `number` | How many pips the price needs to move against the user before they get a margin call |
| `pip_value_per_pip` | `number` | USD value of each pip movement for the user's lot size |
| `margin_required` | `number` | USD amount locked up as margin collateral for this trade |
| `risk_status` | `string` | `"LOW"` if probability < 5%, `"MEDIUM"` if 5%–20%, `"HIGH"` if > 20% |
| `sampled_paths` | `number[]` | Array of **200** simulated pip outcomes — use these to draw a chart |
| `n_paths_simulated` | `integer` | Always `10000` — total paths run internally |
| `sigma_used` | `number` | The pip-space standard deviation used in the simulation (current market volatility) |
| `current_close` | `number` | The most recent EUR/USD closing price from the database |

---

## How to Call the API from React

CORS is fully enabled on the ML server, so **no proxy configuration needed** in `vite.config.js` or `package.json`. Just call it directly.

Copy-paste these functions into your services/api layer:

```javascript
const ML_BASE_URL = 'http://localhost:8000';

/**
 * Check if the ML server is online before making simulation calls.
 * Returns true if healthy, false if server is offline.
 */
export async function checkMLHealth() {
  try {
    const res = await fetch(`${ML_BASE_URL}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok' && data.model_loaded === true;
  } catch {
    return false;  // Connection refused = server not running
  }
}

/**
 * Run an LSTM + Monte Carlo risk simulation for a given trade setup.
 *
 * @param {Object} params
 * @param {number} params.account_balance  - Account equity in USD
 * @param {number} params.lot_size         - Trade size in standard lots
 * @param {number} params.leverage         - Broker leverage (e.g. 100)
 * @param {string} [params.pair_id]        - Currency pair (default: "EURUSD")
 * @returns {Promise<Object>}              - Full risk simulation response
 */
export async function simulateRisk(params) {
  const payload = {
    account_balance: params.account_balance,
    lot_size: params.lot_size,
    leverage: params.leverage,
    pair_id: params.pair_id ?? 'EURUSD',
  };

  const res = await fetch(`${ML_BASE_URL}/simulate-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `ML server error: ${res.status}`);
  }

  return res.json();
}
```

**Usage example in a React component:**
```jsx
const handleSimulate = async () => {
  setLoading(true);
  try {
    const result = await simulateRisk({
      account_balance: 10000,
      lot_size: 1.0,
      leverage: 100,
    });
    setRiskData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Suggested UI Integration

### Form Inputs

The risk simulation form needs **four inputs**:

| Input | Type | Notes |
|---|---|---|
| Account Balance | Number input | USD amount, e.g. `10000` |
| Lot Size | Number input | Default to `1.0`. Add helper text: "1 lot = 100,000 units" |
| Leverage | Dropdown | Options: `50`, `100`, `200`, `500` — default `100` |
| Currency Pair | Dropdown or static label | Only `EURUSD` supported right now, can expand later |

### Displaying the Response

**1. Risk Status Badge** — show prominently at the top of results:
```
🟢 LOW RISK     (risk_status === "LOW")       < 5% chance
🟡 MEDIUM RISK  (risk_status === "MEDIUM")    5–20% chance
🔴 HIGH RISK    (risk_status === "HIGH")       > 20% chance
```

**2. Key Stats Grid** — display these four numbers in a 2×2 card grid:
- **Margin Call Probability:** `(margin_call_probability * 100).toFixed(1) + '%'`
- **Predicted Pip Move:** `predicted_pip_move.toFixed(2) + ' pips'`
- **Margin Required:** `'$' + margin_required.toLocaleString()`
- **Margin Call Threshold:** `margin_call_threshold_pips.toFixed(1) + ' pips against'`

**3. Distribution Chart** — this is the most impactful visual. Use `sampled_paths` (the array of 200 pip values) to draw a histogram or bell curve:
- X-axis: pip movement values
- Y-axis: frequency / probability density
- Add a **vertical red dashed line** at `margin_call_threshold_pips` — everything to the left of this line is the "danger zone"
- Suggested library: **Recharts** (`BarChart` with binned data) or **Chart.js** with a histogram plugin

**4. ML Server Status Banner** — call `checkMLHealth()` on page mount. If it returns `false`, show a dismissible banner:
```
⚠️  ML Risk Engine is offline. Contact Adi to start the backend server.
```
Hide all simulation UI controls, or disable the submit button, while the banner is showing.

---

## ⚠️ Adi's Involvement Required

> **Critical:** The ML server is NOT deployed to the cloud. It runs locally on Adi's laptop. ML features will not work unless Adi's machine is on and the server is actively running.

### Before every demo or testing session, Adi must:

**Step 1 — Ensure Docker/PostgreSQL is running:**
```bash
docker compose up -d postgres
```

**Step 2 — Start the FastAPI ML server via WSL2:**
```bash
wsl -d Ubuntu sh -c "cd '/mnt/c/Users/Adity/Desktop/Projects/DBMS LSTM/sovereign-analytics' && /home/adity/lstm_env/bin/python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000"
```

**Step 3 — Verify it's alive:**

Open [http://localhost:8000/health](http://localhost:8000/health) in a browser. You should see `{"status":"ok","model_loaded":true}`.

> **Note on IP changes:** The ML server connects to PostgreSQL using a WSL2→Windows bridge IP (`10.255.255.254`). If Adi's network changes or WSL2 is reset, the host IP in `~/wsl.env` may need to be updated. Adi handles this — just let him know if things break suddenly.

---

## What's Already Done (Adi's Side)

- ✅ PostgreSQL schema applied — all tables created
- ✅ `pair_daily_rates` seeded with **2,502 days** of EUR/USD historical prices (2018–2025)
- ✅ `news` table seeded with **38,309** macroeconomic news events (EUR + USD)
- ✅ Feature engineering complete — **2,481 rows** in `lstm_features` table
- ✅ LSTM model trained and saved at `model/saved/lstm_model.keras`
- ✅ Feature scaler saved at `model/saved/feature_scaler.pkl`
- ✅ Target scaler saved at `model/saved/target_scaler.pkl`
- ✅ FastAPI server tested — `/health` and `/simulate-risk` both returning correct JSON
- ✅ CORS enabled for all origins (no React proxy config needed)

---

## What Still Needs Doing

| Frontend Teammate | Adi |
|---|---|
| Add `simulateRisk()` and `checkMLHealth()` fetch functions | Keep ML server running during demos |
| Build the risk simulation form UI (4 inputs above) | Coordinate if network/IP changes |
| Build results display: badge, stats grid, pip chart | (Already done) Fix sigma to use live volatility_20 from DB |
| Call `/health` on page load; show "ML Server Offline" banner if down | — |
| Wire `sampled_paths` array into a histogram/distribution chart | — |
| Disable submit button or show loading state while awaiting response | — |

---

## File Structure Reference

```
sovereign-analytics/
├── api/
│   ├── __init__.py
│   └── main.py                  ← FastAPI server — Adi runs this
├── model/
│   └── saved/
│       ├── lstm_model.keras     ← Trained LSTM weights
│       ├── feature_scaler.pkl   ← Input feature scaler
│       └── target_scaler.pkl    ← Pip output scaler (for inverse-transform)
├── data/
│   ├── raw/
│   │   └── eurusd/              ← Historical ZIP files
│   └── scrape.csv               ← Kaggle Forex news events CSV
├── server/
│   └── db/
│       └── schema.sql           ← Full PostgreSQL schema
├── feature_engineering.py       ← Populates lstm_features table
├── seed_db.py                   ← Seeds price + news data
├── train.py                     ← LSTM model training script
├── start_server.sh              ← One-command WSL server launcher
└── ML_BACKEND_HANDOFF.md        ← You are here
```

---

*Questions? Ping Adi. He built the entire ML pipeline and knows every moving part.*
