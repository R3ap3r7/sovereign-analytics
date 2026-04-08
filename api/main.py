import os
import numpy as np
import psycopg2
import joblib
import pydantic
import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load env — WSL_ENV_PATH overrides the default .env path
_env_file = os.environ.get("WSL_ENV_PATH", ".env")
load_dotenv(_env_file, override=True)
print(f"[*] Loaded env from: {_env_file}")

def get_db_url() -> str:
    """Always read fresh from environment so WSL_ENV_PATH changes are respected."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not set. Check .env / WSL_ENV_PATH.")
    return url

# ──────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────
FEATURE_COLS = [
    "close_rate", "daily_return", "ma_10", "ma_20",
    "volatility_20", "rsi_14", "high_impact_eur_ratio", "high_impact_usd_ratio",
]
N_PATHS = 10_000
TARGET_STD_PIPS = 45.09          # σ of the target column from feature engineering

MODEL_PATH          = os.path.join("model", "saved", "lstm_model.keras")
FEATURE_SCALER_PATH = os.path.join("model", "saved", "feature_scaler.pkl")
TARGET_SCALER_PATH  = os.path.join("model", "saved", "target_scaler.pkl")


# ──────────────────────────────────────────────────────────────
# STEP 0 — Lifespan: load model & scalers once at startup
# ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    import tensorflow as tf

    gpus = tf.config.list_physical_devices("GPU")
    print(f"[*] GPUs detected: {gpus}")
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)

    print("[*] Loading LSTM model and scalers...")
    app.state.model          = tf.keras.models.load_model(MODEL_PATH)
    app.state.feature_scaler = joblib.load(FEATURE_SCALER_PATH)
    app.state.target_scaler  = joblib.load(TARGET_SCALER_PATH)
    print("[READY] Model and scalers loaded.")

    yield   # ← application runs here

    # (optional shutdown cleanup — nothing needed)
    print("[*] Shutting down.")


# ──────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Forex Risk Management API",
    description="LSTM-powered Monte Carlo pip risk simulator for EURUSD",
    version="1.0.0",
    lifespan=lifespan,
)

# STEP 5 — CORS (allow all origins for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────
# STEP 1 — Request schema
# ──────────────────────────────────────────────────────────────
class SimulateRequest(pydantic.BaseModel):
    account_balance: float = pydantic.Field(..., example=1000.0, description="Account equity in USD")
    lot_size: float        = pydantic.Field(..., example=1.0,    description="Standard lots (1 lot = 100k units)")
    leverage: int          = pydantic.Field(..., example=100,    description="Broker leverage ratio (e.g. 100 = 1:100)")
    pair_id: str           = pydantic.Field("EURUSD",            description="Currency pair (only EURUSD supported)")


# ──────────────────────────────────────────────────────────────
# STEP 2 — DB helper
# ──────────────────────────────────────────────────────────────
def get_latest_features(pair_id: str, conn) -> tuple[np.ndarray, float]:
    """
    Returns (feature_matrix, current_close) where:
      feature_matrix : np.ndarray of shape (60, 8), chronological order
      current_close  : float  — close_rate of the most recent row
    Raises HTTP 404 if fewer than 60 rows exist for the pair.
    """
    query = """
        SELECT close_rate, daily_return, ma_10, ma_20,
               volatility_20, rsi_14, high_impact_eur_ratio, high_impact_usd_ratio
        FROM lstm_features
        WHERE pair_id = %s
        ORDER BY traded_on DESC
        LIMIT 60;
    """
    cur = conn.cursor()
    cur.execute(query, (pair_id,))
    rows = cur.fetchall()
    cur.close()

    if len(rows) < 60:
        raise HTTPException(
            status_code=404,
            detail=f"Not enough data for {pair_id}: need 60 rows, got {len(rows)}. "
                   "Run feature_engineering.py first.",
        )

    # Rows are DESC from the query — reverse to get chronological order
    rows_chron = rows[::-1]
    matrix     = np.array(rows_chron, dtype=np.float32)   # (60, 8)
    current_close = float(rows_chron[-1][0])               # last close_rate

    return matrix, current_close


# ──────────────────────────────────────────────────────────────
# STEP 4 — Health check
# ──────────────────────────────────────────────────────────────
@app.get("/health", summary="Health check")
async def health():
    return {"status": "ok", "model_loaded": True, "pair": "EURUSD"}


# ──────────────────────────────────────────────────────────────
# STEP 3 — POST /simulate-risk
# ──────────────────────────────────────────────────────────────
@app.post("/simulate-risk", summary="Run LSTM + Monte Carlo risk simulation")
async def simulate_risk(req: SimulateRequest):
    # ── 3a: LSTM drift prediction ──────────────────────────────
    db_url = get_db_url()
    try:
        conn = psycopg2.connect(db_url)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB connection failed: {e}")

    try:
        raw_matrix, current_close = get_latest_features(req.pair_id, conn)
    finally:
        conn.close()

    feature_scaler = app.state.feature_scaler
    target_scaler  = app.state.target_scaler
    model          = app.state.model

    scaled_matrix = feature_scaler.transform(raw_matrix)          # (60, 8)
    X_input       = scaled_matrix.reshape(1, 60, len(FEATURE_COLS))  # (1, 60, 8)

    pred_scaled       = model.predict(X_input, verbose=0)          # (1, 1)
    predicted_pip_move = float(
        target_scaler.inverse_transform(pred_scaled)[0, 0]
    )

    # ── 3b: Trade parameters ───────────────────────────────────
    pip_value                 = 10.0 * req.lot_size   # USD per pip for EURUSD standard lot
    margin_required           = (req.lot_size * 100_000 * current_close) / req.leverage
    margin_call_threshold_pips = -((req.account_balance - margin_required) / pip_value)

    # ── 3c: Monte Carlo (10,000 paths) ─────────────────────────
    # Query latest actual volatility_20 from DB and convert to pip-space σ
    try:
        vol_conn = psycopg2.connect(db_url)
        vol_cur  = vol_conn.cursor()
        vol_cur.execute(
            'SELECT volatility_20 FROM lstm_features WHERE pair_id = %s ORDER BY traded_on DESC LIMIT 1',
            (req.pair_id,)
        )
        latest_vol = vol_cur.fetchone()[0]
        vol_cur.close()
        vol_conn.close()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to query volatility_20: {e}")

    sigma_pips = float(latest_vol) * TARGET_STD_PIPS    # convert return-space → pip-space σ

    rng             = np.random.default_rng()
    Z               = rng.standard_normal(N_PATHS)
    simulated_moves = predicted_pip_move + (sigma_pips * Z)   # shape (10000,)

    margin_call_hits        = int(np.sum(simulated_moves <= margin_call_threshold_pips))
    margin_call_probability = margin_call_hits / N_PATHS

    # ── 3d: Sample 200 paths for frontend chart ────────────────
    sample_indices = rng.choice(N_PATHS, size=200, replace=False)
    sampled_paths  = simulated_moves[sample_indices].tolist()

    # ── 3e: Risk classification & response ────────────────────
    if margin_call_probability > 0.20:
        risk_status = "HIGH"
    elif margin_call_probability > 0.05:
        risk_status = "MEDIUM"
    else:
        risk_status = "LOW"

    return {
        "pair_id":                    req.pair_id,
        "predicted_pip_move":         round(predicted_pip_move, 4),
        "margin_call_probability":    round(margin_call_probability, 4),
        "margin_call_threshold_pips": round(margin_call_threshold_pips, 2),
        "pip_value_per_pip":          pip_value,
        "margin_required":            round(margin_required, 2),
        "risk_status":                risk_status,
        "sampled_paths":              sampled_paths,
        "n_paths_simulated":          N_PATHS,
        "sigma_used":                 round(sigma_pips, 4),
        "current_close":              round(current_close, 6),
    }


# ──────────────────────────────────────────────────────────────
# STEP 6 — Entrypoint
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=False)
