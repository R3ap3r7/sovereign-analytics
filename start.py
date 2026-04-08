import os
import subprocess
import sys
import threading

# ANSI Escape codes for pretty colored prefixes
COLORS = {
    'WEB': '\033[96m',      # Cyan
    'NODE': '\033[92m',     # Green
    'ML': '\033[95m',       # Magenta
    'RESET': '\033[0m'
}

def stream_logs(process, name):
    """Reads stdout from the process and prints it out with a colored prefix."""
    prefix = f"{COLORS.get(name, '')}[{name}]{COLORS['RESET']}"
    # Read line-by-line continuously
    for line in iter(process.stdout.readline, ''):
        if line:
            sys.stdout.write(f"{prefix} | {line}")
            sys.stdout.flush()
    process.stdout.close()

def main():
    print("🚀 Starting Sovereign Analytics...")
    print("This will launch the Vite Frontend, Express Backend, and FastAPI ML Engine.")
    print("Press Ctrl+C at any time to shut everything down.\n")

    # Use shell=True for native Windows resolution of npm / WSL commands
    # Route stderr to stdout so we can stream it all cleanly in one thread per process
    p_web = subprocess.Popen(
        "npm run dev:web", 
        shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace'
    )
    p_api = subprocess.Popen(
        "npm run dev:api", 
        shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace'
    )
    p_ml = subprocess.Popen(
        "wsl -d Ubuntu sh ./start_server.sh", 
        shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace'
    )

    # Start background threads to print the output live
    threading.Thread(target=stream_logs, args=(p_web, 'WEB'), daemon=True).start()
    threading.Thread(target=stream_logs, args=(p_api, 'NODE'), daemon=True).start()
    threading.Thread(target=stream_logs, args=(p_ml, 'ML'), daemon=True).start()

    try:
        # Keep the main process alive until interrupted
        p_web.wait()
        p_api.wait()
        p_ml.wait()
    except KeyboardInterrupt:
        print("\n\n🛑 Caught KeyboardInterrupt! Shutting down all local servers safely...")
        
        # We use Windows 'taskkill' /T to kill the process tree (since shell=True spawns cmd.exe)
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p_web.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p_api.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p_ml.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            pass
        
        print("Done. Goodbye!")
        sys.exit(0)

if __name__ == '__main__':
    main()
