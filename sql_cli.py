"""
Dependencies to install:
    pip install psycopg2-binary python-dotenv tabulate
    # On Linux/WSL, readline is built-in. On Windows, install:
    pip install pyreadline3
"""

import os
import sys
import time
import psycopg2
from dotenv import load_dotenv
from tabulate import tabulate

# Enable ANSI escape sequences on Windows
if os.name == 'nt':
    os.system('')

try:
    import readline
except ImportError:
    pass

# ANSI Escape Sequences
COLOR_RED = "\033[91m"
COLOR_RESET = "\033[0m"
BOLD = "\033[1m"
DIM_ITALIC = "\033[2;3m"

def print_error(msg):
    print(f"{COLOR_RED}{msg}{COLOR_RESET}")

def format_cell(val):
    if val is None:
        return f"{DIM_ITALIC}NULL{COLOR_RESET}"
    s = str(val)
    if len(s) > 50:
        return s[:47] + "..."
    return s

def show_tables(cur):
    query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """
    try:
        cur.execute(query)
        tables = cur.fetchall()
        
        if not tables:
            print("No relations found.")
            return

        results = []
        for t in tables:
            t_name = t[0]
            try:
                cur.execute(f"SELECT count(*) FROM {t_name}")
                count = cur.fetchone()[0]
                results.append([t_name, count])
            except Exception:
                pass # skip if counting fails (e.g. permission error)
        
        headers = [f"{BOLD}table_name{COLOR_RESET}", f"{BOLD}row_count{COLOR_RESET}"]
        print()
        print(tabulate(results, headers=headers, tablefmt="psql", numalign="right"))
        print()
    except Exception as e:
        print_error(str(e).strip())

def describe_table(cur, table_name):
    query = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
    """
    try:
        cur.execute(query, (table_name,))
        columns = cur.fetchall()
        if not columns:
            print(f'Did not find any relation named "{table_name}".')
            return
        
        headers = [f"{BOLD}column_name{COLOR_RESET}", f"{BOLD}type{COLOR_RESET}", f"{BOLD}nullable{COLOR_RESET}"]
        print(f'\nTable "public.{table_name}"')
        print(tabulate(columns, headers=headers, tablefmt="psql"))
        print()
    except Exception as e:
        print_error(str(e).strip())

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print_error("DATABASE_URL not found in .env")
        sys.exit(1)

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print_error(f"Could not connect to database: {str(e).strip()}")
        sys.exit(1)

    dsn_params = conn.get_dsn_parameters()
    db_name = dsn_params.get("dbname", "unknown")
    db_host = dsn_params.get("host", "unknown")

    print(f"Connected to database: {BOLD}{db_name}{COLOR_RESET} at host: {BOLD}{db_host}{COLOR_RESET}\n")
    show_tables(cur)

    prompt_main = f"sovereign-analytics=# "
    prompt_cont = "-> "
    query_buffer = ""
    timing_enabled = False

    while True:
        try:
            prompt = prompt_cont if query_buffer else prompt_main
            line = input(prompt)
        except EOFError:
            print()
            break
        except KeyboardInterrupt:
            print()
            query_buffer = ""
            continue

        raw_line = line.strip()

        # Meta commands (execute only when buffer is empty)
        if not query_buffer and (raw_line.startswith("\\") or raw_line in ("exit", "quit")):
            cmd = raw_line.split()
            if not cmd:
                continue
            
            first_arg = cmd[0].lower()
            if first_arg in ("\\q", "\\quit", "exit", "quit"):
                break
            elif first_arg == "\\clear":
                print("\033[H\033[J", end="") # Clear screen and move cursor to top
            elif first_arg == "\\dt":
                show_tables(cur)
            elif first_arg == "\\d":
                if len(cmd) > 1:
                    describe_table(cur, cmd[1])
                else:
                    print_error("\\d requires a table name.")
            elif first_arg == "\\timing":
                timing_enabled = not timing_enabled
                print(f"Timing is {'on' if timing_enabled else 'off'}.")
            else:
                print_error(f"Unknown command: {first_arg}")
            continue

        if not raw_line and not query_buffer:
            continue

        query_buffer += line + "\n"

        if ";" in raw_line:
            query = query_buffer.strip()
            query_buffer = ""
            
            start_time = time.time()
            success = False
            
            try:
                cur.execute(query)
                success = True
            except Exception as e:
                print_error(str(e).strip())
            
            end_time = time.time()

            if success:
                try:
                    if cur.description:
                        # SELECT query
                        rows = cur.fetchall()
                        formatted_rows = [[format_cell(col) for col in row] for row in rows]
                        headers = [f"{BOLD}{desc[0]}{COLOR_RESET}" for desc in cur.description]
                        
                        if formatted_rows:
                            print(tabulate(formatted_rows, headers=headers, tablefmt="psql", numalign="right"))
                        else:
                            # Empty result set
                            print(tabulate([], headers=headers, tablefmt="psql"))
                        
                        row_count = cur.rowcount
                        print(f"({row_count} row{'s' if row_count != 1 else ''})")
                    else:
                        # Non-SELECT query (INSERT, UPDATE, DELETE, CREATE, etc.)
                        status = cur.statusmessage
                        if status:
                            print(status)
                except psycopg2.ProgrammingError as e:
                    # Catch cases where we think there's a description but fetching fails, or other query mismatches
                    print_error(str(e).strip())
            
            if timing_enabled:
                print(f"Time: {(end_time - start_time) * 1000:.2f} ms")
            print()

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
