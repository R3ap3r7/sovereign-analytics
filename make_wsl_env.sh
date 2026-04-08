#!/bin/sh
# Strip Windows \r line endings and replace localhost with WSL host IP
sed 's/\r//; s/localhost/10.255.255.254/' /mnt/c/Users/Adity/Desktop/Projects/DBMS\ LSTM/sovereign-analytics/.env > ~/wsl.env
echo "[+] wsl.env created at ~/wsl.env:"
head -2 ~/wsl.env
