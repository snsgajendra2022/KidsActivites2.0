#!/usr/bin/env bash
set -euo pipefail
cd /home/KidsActivites2.0

# Production domain is served over HTTPS — use a static build (no Vite HMR websocket).
npm run build
exec npm run preview -- --host 0.0.0.0 --port 3000
