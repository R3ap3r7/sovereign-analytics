import os
import json
import psycopg2
import pandas as pd
import numpy as np
from psycopg2.extras import execute_values
from dotenv import load_dotenv

def main():
    # Load credentials
    load_dotenv()
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        print("[-] Error: DATABASE_URL not found in .env string.")
        return

    # Connect to PostgreSQL
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
    except Exception as e:
        print(f"[-] Database connection failed: {e}")
        return

    # STEP 1 — Query price data
    print("[*] Step 1: Querying EURUSD daily rates...")
    query_rates = "SELECT traded_on, close_rate FROM pair_daily_rates WHERE pair_id = 'EURUSD' ORDER BY traded_on ASC;"
    cursor.execute(query_rates)
    rates_rows = cursor.fetchall()
    
    if not rates_rows:
        print("[-] Error: No daily rates found for EURUSD. Seed DB first.")
        return
        
    df = pd.DataFrame(rates_rows, columns=['traded_on', 'close_rate'])
    df['traded_on'] = pd.to_datetime(df['traded_on']).dt.date
    df['close_rate'] = df['close_rate'].astype(float)
    
    # STEP 2 — Query news data
    print("[*] Step 2: Querying news data to compute global context ratios...")
    cursor.execute("SELECT payload FROM news;")
    news_rows = cursor.fetchall()
    
    eur_total = 0
    eur_high = 0
    usd_total = 0
    usd_high = 0
    
    for row in news_rows:
        payload = row[0]
        # Just in case it's a string instead of a dict
        if isinstance(payload, str):
            payload = json.loads(payload)
            
        curr = payload.get('currency')
        impact = str(payload.get('impact', ''))
        
        if curr == 'EUR':
            eur_total += 1
            if 'High' in impact:
                eur_high += 1
        elif curr == 'USD':
            usd_total += 1
            if 'High' in impact:
                usd_high += 1
                
    eur_ratio = eur_high / eur_total if eur_total > 0 else 0.0
    usd_ratio = usd_high / usd_total if usd_total > 0 else 0.0
    
    print(f"   -> EUR News: {eur_high} high impact / {eur_total} total ({eur_ratio:.4f})")
    print(f"   -> USD News: {usd_high} high impact / {usd_total} total ({usd_ratio:.4f})")
    
    # Add scalar context features
    df['high_impact_eur_ratio'] = eur_ratio
    df['high_impact_usd_ratio'] = usd_ratio

    # STEP 3 — Compute price features on close_rate
    print("[*] Step 3: Computing price features (daily return, SMAs, volatility, RSI, target)...")
    
    df['daily_return'] = df['close_rate'].pct_change() * 100
    df['ma_10'] = df['close_rate'].rolling(window=10).mean()
    df['ma_20'] = df['close_rate'].rolling(window=20).mean()
    df['volatility_20'] = df['daily_return'].rolling(window=20).std()
    
    # RSI 14 (Wilder smoothing technique)
    delta = df['close_rate'].diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    
    # Wilder's smoothing is analogous to Exponential Moving Average with alpha = 1 / N 
    # Pandas ewm with com=(N-1) is exactly the formula for Wilder Moving Average
    avg_gain = gain.ewm(com=13, min_periods=1, adjust=False).mean()
    avg_loss = loss.ewm(com=13, min_periods=1, adjust=False).mean()
    
    rs = avg_gain / avg_loss
    df['rsi_14'] = 100.0 - (100.0 / (1.0 + rs))
    
    # Target: next day pip movement
    df['target'] = (df['close_rate'].shift(-1) - df['close_rate']) * 10000

    # Explicit pair_id column
    df['pair_id'] = 'EURUSD'
    
    # Prepare exact column ordering matching DB schema exactly
    col_order = [
        'pair_id', 'traded_on', 'close_rate', 'daily_return',
        'ma_10', 'ma_20', 'volatility_20', 'rsi_14',
        'high_impact_eur_ratio', 'high_impact_usd_ratio', 'target'
    ]
    df = df[col_order]

    # STEP 4 — Drop NaN rows
    initial_rows = len(df)
    df.dropna(inplace=True)
    final_rows = len(df)
    print(f"[*] Step 4: Dropping NaN rows...")
    print(f"   -> Dropped {initial_rows - final_rows} rows due to looking back/forward limits. (Before: {initial_rows}, After: {final_rows})")
    
    if final_rows == 0:
        print("[-] Error: The dataset had fewer rows than our longest lookback window. Nothing left.")
        cursor.close()
        conn.close()
        return

    # STEP 5 — Create lstm_features table
    print("[*] Step 5: Creating lstm_features table & inserting rows...")
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS lstm_features (
        pair_id TEXT NOT NULL,
        traded_on DATE NOT NULL,
        close_rate NUMERIC(18,8),
        daily_return NUMERIC(18,8),
        ma_10 NUMERIC(18,8),
        ma_20 NUMERIC(18,8),
        volatility_20 NUMERIC(18,8),
        rsi_14 NUMERIC(18,8),
        high_impact_eur_ratio NUMERIC(18,8),
        high_impact_usd_ratio NUMERIC(18,8),
        target NUMERIC(18,8),
        PRIMARY KEY (pair_id, traded_on)
    );
    """
    cursor.execute(create_table_sql)
    
    # Replace pd.isna (pandas NaNs) with None to satisfy psycopg2 properly formatting arrays
    records = [
        tuple((None if pd.isna(x) else (float(x) if isinstance(x, np.floating) else x)) for x in record) 
        for record in df.to_records(index=False)
    ]
    
    insert_sql = """
        INSERT INTO lstm_features (
            pair_id, traded_on, close_rate, daily_return,
            ma_10, ma_20, volatility_20, rsi_14,
            high_impact_eur_ratio, high_impact_usd_ratio, target
        ) VALUES %s
        ON CONFLICT (pair_id, traded_on) DO NOTHING;
    """
    
    execute_values(cursor, insert_sql, records)

    # STEP 6 — Print summary
    print(f"[+] Successfully bulk inserted {len(records)} rows into lstm_features.")
    print("\n" + "="*65)
    print(f"{'FINAL FEATURE ENGINEERING SUMMARY':^65}")
    print("="*65)
    print(f"Total Active Rows Inserted: {len(df)}")
    print(f"Date Range Represented    : {df['traded_on'].min()} to {df['traded_on'].max()}")
    print("-" * 65)
    print(f"{'Feature':<15} | {'Mean':>10} | {'Std':>10} | {'Min':>10} | {'Max':>10}")
    print("-" * 65)
    
    display_features = ['close_rate', 'daily_return', 'ma_10', 'ma_20', 'volatility_20', 'rsi_14', 'target']
    for col in display_features:
        mean_val = df[col].mean()
        std_val = df[col].std()
        min_val = df[col].min()
        max_val = df[col].max()
        print(f"{col:<15} | {mean_val:10.4f} | {std_val:10.4f} | {min_val:10.4f} | {max_val:10.4f}")
        
    print("="*65)
        
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
