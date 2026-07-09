#!/usr/bin/env bash
set -euo pipefail
cd /home/KidsActivites2.0
exec npm run dev -- --host 0.0.0.0 --port 3000
