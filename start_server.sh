#!/bin/sh
# Start the FastAPI server from WSL
cd /mnt/c/Users/Adity/Desktop/Projects/DBMS\ LSTM/sovereign-analytics

# Recreate the WSL env with correct host IP and no Windows line endings
sed 's/\r//; s/localhost/10.255.255.254/' .env > ~/wsl.env

echo "[+] Starting FastAPI server..."
WSL_ENV_PATH=/home/adity/wsl.env /home/adity/lstm_env/bin/python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000
