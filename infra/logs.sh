#!/bin/bash
./infra/ssh.sh "$1" "journalctl -u $2 -n 100 -f"
