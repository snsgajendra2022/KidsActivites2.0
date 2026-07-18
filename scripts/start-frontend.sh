#!/usr/bin/env bash
set -euo pipefail
cd /home/KidsActivites2.0

# Free the preview port so nginx upstream ( :3000 ) always matches.
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

# Production domain is served over HTTPS — use a static build (no Vite HMR websocket).
npm run build
exec npm run preview -- --host 0.0.0.0 --port 3000 --strictPort
