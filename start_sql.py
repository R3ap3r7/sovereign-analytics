import os
import subprocess
import sys

def main():
    print("🚀 Booting Sovereign Analytics SQL CLI via WSL environment...")
    
    # We execute this inside the WSL Ubuntu environment so it can access the 
    # Python environment containing psycopg2 & tabulate that we previously configured.
    wsl_command = (
        'wsl -d Ubuntu sh -c "cd \'/mnt/c/Users/Adity/Desktop/Projects/DBMS LSTM/sovereign-analytics\' '
        '&& /home/adity/lstm_env/bin/python3 sql_cli.py"'
    )
    
    try:
        # Run process synchronously so the user can interact directly in Windows terminal
        subprocess.run(wsl_command, shell=True)
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Failed to start SQL CLI: {e}")
        
    print("\nGoodbye!")

if __name__ == "__main__":
    main()
