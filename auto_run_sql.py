import sys
import random
import time

def main():
    with open('random_queries.sql', 'r', encoding='utf-8') as f:
        content = f.read()

    # Read each line as a single query since we formatted them with 1 query per line
    queries = [q.strip() for q in content.split('\n') if q.strip()]
    
    random.shuffle(queries)
    
    # Cap at 50 queries
    queries = queries[:50]
    queries.append("exit") # Needed to cleanly exit sql_cli.py
    
    query_iterator = iter(queries)
    
    # Mock builtins.input to feed our predefined queries automatically
    import builtins
    
    def mocked_input(prompt=''):
        sys.stdout.write(prompt)
        sys.stdout.flush()
        
        try:
            val = next(query_iterator)
            time.sleep(0.05) # Add a tiny delay to simulate typing or pacing
            print(val)
            return val
        except StopIteration:
            raise EOFError()
            
    # Override standard input
    builtins.input = mocked_input
    
    # Import the CLI previously built
    import sql_cli
    
    print(f"--- Starting automated run of {len(queries)-1} random queries ---\n")
    
    try:
        sql_cli.main()
    except EOFError:
        pass # Expected when no more input
        
    print("\n--- Automation Finished ---")

if __name__ == '__main__':
    main()
