import os
import json
import numpy as np
import pandas as pd
import psycopg2
import joblib
from dotenv import load_dotenv
from sklearn.preprocessing import StandardScaler

# ──────────────────────────────────────────────
# STEP 0 — GPU Detection (no hard assert for WSL2)
# ──────────────────────────────────────────────
import tensorflow as tf

gpus = tf.config.list_physical_devices('GPU')
print(f"[*] GPUs detected: {gpus}")
if len(gpus) > 0:
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)
    print(f"[+] GPU memory growth enabled on {len(gpus)} GPU(s).")
else:
    print("[!] No GPU detected — running on CPU. Training will be slower but functional.")

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
SEQUENCE_LENGTH = 60
FEATURE_COLS = [
    'close_rate', 'daily_return', 'ma_10', 'ma_20',
    'volatility_20', 'rsi_14', 'high_impact_eur_ratio', 'high_impact_usd_ratio'
]
TARGET_COL = 'target'
MODEL_DIR = os.path.join('model', 'saved')

# ──────────────────────────────────────────────
# STEP 1 — Load data from DB
# ──────────────────────────────────────────────
print("\n[*] Step 1: Loading lstm_features from database...")

# Load .env — support override via WSL_ENV_PATH env var
env_path = os.environ.get('WSL_ENV_PATH', '.env')
load_dotenv(env_path)
db_url = os.getenv('DATABASE_URL')

if not db_url:
    raise RuntimeError("DATABASE_URL not found in .env file.")

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

query = """
    SELECT traded_on, close_rate, daily_return, ma_10, ma_20,
           volatility_20, rsi_14, high_impact_eur_ratio, high_impact_usd_ratio, target
    FROM lstm_features
    WHERE pair_id = 'EURUSD'
    ORDER BY traded_on ASC;
"""
cursor.execute(query)
rows = cursor.fetchall()
cursor.close()
conn.close()

if not rows:
    raise RuntimeError("No rows found in lstm_features for EURUSD. Run feature_engineering.py first.")

df = pd.DataFrame(rows, columns=['traded_on'] + FEATURE_COLS + [TARGET_COL])
print(f"[+] Loaded {len(df)} rows from lstm_features.")
print(f"    Date range: {df['traded_on'].min()} to {df['traded_on'].max()}")

# Keep aside for reference, drop before modelling
traded_on_col = df['traded_on'].copy()
df.drop(columns=['traded_on'], inplace=True)

# ──────────────────────────────────────────────
# STEP 2 — Scale features and target
# ──────────────────────────────────────────────
print("\n[*] Step 2: Fitting and applying StandardScalers...")

os.makedirs(MODEL_DIR, exist_ok=True)

feature_scaler = StandardScaler()
target_scaler = StandardScaler()

X_raw = df[FEATURE_COLS].values.astype(np.float32)
y_raw = df[TARGET_COL].values.astype(np.float32).reshape(-1, 1)

X_scaled = feature_scaler.fit_transform(X_raw)
y_scaled = target_scaler.fit_transform(y_raw).flatten()

feature_scaler_path = os.path.join(MODEL_DIR, 'feature_scaler.pkl')
target_scaler_path  = os.path.join(MODEL_DIR, 'target_scaler.pkl')

joblib.dump(feature_scaler, feature_scaler_path)
joblib.dump(target_scaler,  target_scaler_path)
print(f"[+] feature_scaler saved to {feature_scaler_path}")
print(f"[+] target_scaler  saved to {target_scaler_path}")

# ──────────────────────────────────────────────
# STEP 3 — Build sliding window sequences
# ──────────────────────────────────────────────
print(f"\n[*] Step 3: Building sliding window sequences (length={SEQUENCE_LENGTH})...")

X_seqs = []
y_seqs = []

for i in range(SEQUENCE_LENGTH, len(X_scaled)):
    X_seqs.append(X_scaled[i - SEQUENCE_LENGTH : i])   # (60, 8)
    y_seqs.append(y_scaled[i])

X_seqs = np.array(X_seqs, dtype=np.float32)   # (n_samples, 60, 8)
y_seqs = np.array(y_seqs, dtype=np.float32)   # (n_samples,)

print(f"[+] X shape: {X_seqs.shape} | y shape: {y_seqs.shape}")

# ──────────────────────────────────────────────
# STEP 4 — Train/test split (chronological, no shuffle)
# ──────────────────────────────────────────────
print("\n[*] Step 4: Splitting into train/test (80/20, time-ordered)...")

split_idx = int(len(X_seqs) * 0.80)
X_train, X_test = X_seqs[:split_idx], X_seqs[split_idx:]
y_train, y_test = y_seqs[:split_idx], y_seqs[split_idx:]

print(f"    Train size: {len(X_train)} samples")
print(f"    Test  size: {len(X_test)} samples")

# ──────────────────────────────────────────────
# STEP 5 — Build LSTM model
# ──────────────────────────────────────────────
print("\n[*] Step 5: Building LSTM model...")

model = Sequential([
    Input(shape=(SEQUENCE_LENGTH, len(FEATURE_COLS))),
    LSTM(128, return_sequences=True),
    Dropout(0.2),
    LSTM(64, return_sequences=False),
    Dropout(0.2),
    Dense(32, activation='relu'),
    Dense(1, activation='linear')
])
model.compile(optimizer='adam', loss='huber', metrics=['mae'])
model.summary()

# ──────────────────────────────────────────────
# STEP 6 — Train
# ──────────────────────────────────────────────
print("\n[*] Step 6: Training LSTM model...")

model_save_path = os.path.join(MODEL_DIR, 'lstm_model.keras')

callbacks = [
    EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True),
    ModelCheckpoint(model_save_path, save_best_only=True)
]

history = model.fit(
    X_train, y_train,
    epochs=100,
    batch_size=32,
    validation_data=(X_test, y_test),
    callbacks=callbacks,
    verbose=1
)

# ──────────────────────────────────────────────
# STEP 7 — Evaluate
# ──────────────────────────────────────────────
print("\n[*] Step 7: Evaluating model on test set...")

y_pred_scaled = model.predict(X_test, verbose=0).flatten()

# Inverse transform back to raw pip scale
y_pred_pips = target_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
y_test_pips = target_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

mae_pips  = np.mean(np.abs(y_pred_pips - y_test_pips))
rmse_pips = np.sqrt(np.mean((y_pred_pips - y_test_pips) ** 2))

direction_correct = np.sum(np.sign(y_pred_pips) == np.sign(y_test_pips))
directional_acc   = direction_correct / len(y_test_pips) * 100.0

best_epoch    = int(np.argmin(history.history['val_loss'])) + 1
best_val_loss = float(min(history.history['val_loss']))

print("\n" + "="*55)
print(f"{'EVALUATION RESULTS':^55}")
print("="*55)
print(f"  MAE  (pips)          : {mae_pips:.4f}")
print(f"  RMSE (pips)          : {rmse_pips:.4f}")
print(f"  Directional Accuracy : {directional_acc:.2f}%")
print(f"  Best Epoch           : {best_epoch} (val_loss = {best_val_loss:.6f})")
print("="*55)

# ──────────────────────────────────────────────
# STEP 8 — Save training history
# ──────────────────────────────────────────────
print("\n[*] Step 8: Saving training history...")

history_path = os.path.join(MODEL_DIR, 'training_history.json')
serialisable_history = {
    k: [float(v) for v in vals]
    for k, vals in history.history.items()
}
with open(history_path, 'w') as f:
    json.dump(serialisable_history, f, indent=2)

print(f"[+] Training history saved to {history_path}")
print(f"\n[DONE] Model saved to {model_save_path}")
