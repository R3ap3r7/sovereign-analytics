import os
import zipfile
import csv
import glob
import hashlib
import json
import argparse
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

def find_zip_files(base_dirs):
    """Search for zip files in a list of potential base directories."""
    for base in base_dirs:
        if os.path.exists(base):
            zips = glob.glob(os.path.join(base, '**', '*.zip'), recursive=True)
            if zips:
                return zips
    return []

def safe_float(val):
    if not val:
        return None
    try:
        return float(val)
    except ValueError:
        return None

def main():
    parser = argparse.ArgumentParser(description="Seed Forex DB")
    parser.add_argument('--news-csv', type=str, help="Path to the Kaggle news CSV file (e.g. scrape.csv)")
    args = parser.parse_args()

    # 1. Load credentials from .env
    load_dotenv()
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        print("[-] Error: DATABASE_URL not found in .env string.")
        return

    conn = None
    try:
        print("[*] Connecting to the database...")
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()

        # ---------- PART 1 & 2: PAIR AND DAILY RATES ----------
        print("\n=== Seeding Pairs and Rates ===")
        # Insert EURUSD into the pairs table
        # Let the frontend express backend seed the fully structured eur-usd Pair model first.

        search_dirs = [
            os.path.join(os.getcwd(), 'data'),
            os.path.join(os.getcwd(), 'data', 'raw', 'eurusd'),
            os.path.join(os.path.dirname(os.getcwd()), 'data'),
            os.path.join(os.path.dirname(os.getcwd()), 'data', 'raw', 'eurusd')
        ]
        
        zip_files = find_zip_files(search_dirs)
        if not zip_files:
            print("[-] Warning: No .zip files found for daily rates in known data folders.")
        else:
            print(f"[*] Found {len(zip_files)} zip file(s) for daily rates.")
            records_to_insert = []
            
            for zip_path in zip_files:
                try:
                    with zipfile.ZipFile(zip_path, 'r') as z:
                        for filename in z.namelist():
                            if filename.lower().endswith('.csv'):
                                with z.open(filename) as f:
                                    for line in f:
                                        decoded_line = line.decode('utf-8').strip()
                                        if not decoded_line:
                                            continue
                                            
                                        delimiter = ';' if ';' in decoded_line else ','
                                        parts = decoded_line.split(delimiter)
                                        
                                        if len(parts) >= 5:
                                            date_str = parts[0].split()[0]
                                            close_rate = parts[4]
                                            try:
                                                traded_on = datetime.strptime(date_str, '%Y%m%d').date()
                                                records_to_insert.append(('eur-usd', traded_on, close_rate))
                                            except ValueError:
                                                continue
                except Exception as e:
                    print(f"[-] Error processing {zip_path}:\n{e}")

            if records_to_insert:
                print(f"[*] Deduping {len(records_to_insert)} extracted daily rate rows...")
                deduped_records = {}
                for pair, traded_on, close_rate in records_to_insert:
                    deduped_records[(pair, traded_on)] = (pair, traded_on, close_rate)
                unique_records = list(deduped_records.values())

                print(f"[*] Bulk inserting {len(unique_records)} unique daily rate records...")
                insert_rates_query = """
                    INSERT INTO pair_daily_rates (pair_id, traded_on, close_rate)
                    VALUES %s
                    ON CONFLICT (pair_id, traded_on) DO NOTHING;
                """
                execute_values(cursor, insert_rates_query, unique_records)
                print("[+] Daily rates successfully seeded.")

        # ---------- PART 3: SEED NEWS FROM CSV ----------
        if args.news_csv:
            if not os.path.exists(args.news_csv):
                print(f"\n[-] Error: The specified news CSV file was not found: {args.news_csv}")
            else:
                print(f"\n=== Seeding News from {args.news_csv} ===")
                news_records_to_insert = []
                
                try:
                    with open(args.news_csv, 'r', encoding='utf-8') as f:
                        reader = csv.DictReader(f)
                        for row in reader:
                            curr = row.get('currency', '').strip()
                            if curr not in ('EUR', 'USD'):
                                continue
                                
                            dt = row.get('datetime', '').strip()
                            ev = row.get('event', '').strip()
                            actual = row.get('actual')
                            forecast = row.get('forecast')
                            previous = row.get('previous')
                            impact = row.get('impact')

                            # Generate MD5 ID
                            id_str = f"{dt}{curr}{ev}"
                            news_id = hashlib.md5(id_str.encode('utf-8')).hexdigest()
                            
                            act_val = safe_float(actual)
                            fc_val = safe_float(forecast)
                            
                            surprise = None
                            if act_val is not None and fc_val is not None:
                                surprise = act_val - fc_val
                                
                            payload = {
                                "currency": curr,
                                "event": ev,
                                "actual": actual,
                                "forecast": forecast,
                                "previous": previous,
                                "impact": impact,
                                "surprise": surprise
                            }
                            
                            news_records_to_insert.append((news_id, json.dumps(payload)))
                            
                    if news_records_to_insert:
                        print(f"[*] Bulk inserting {len(news_records_to_insert)} news records...")
                        insert_news_query = """
                            INSERT INTO news (id, payload)
                            VALUES %s
                            ON CONFLICT (id) DO NOTHING;
                        """
                        execute_values(cursor, insert_news_query, news_records_to_insert)
                        print("[+] News records successfully seeded.")
                    else:
                        print("[-] No matching EUR or USD news records found in the CSV.")
                        
                except Exception as e:
                    print(f"[-] Error processing news CSV:\n{e}")

        # ---------- FINAL COUNTS ----------
        print("\n=== Final Table Counts ===")
        cursor.execute("SELECT COUNT(*) FROM pairs;")
        print(f" - pairs: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM pair_daily_rates;")
        print(f" - pair_daily_rates: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM news;")
        print(f" - news: {cursor.fetchone()[0]}")

    except psycopg2.Error as e:
        print(f"[-] Database error occurred:\n{e}")
    except Exception as e:
        print(f"[-] An unexpected error occurred:\n{e}")
    finally:
        if conn:
            if 'cursor' in locals() and cursor:
                cursor.close()
            conn.close()
            print("\n[*] Database connection closed.")

if __name__ == "__main__":
    main()
