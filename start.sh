#!/bin/bash
set -e
cd /tmp/tempo.github.io
git fetch origin
git reset --hard origin/main
git pull origin main
rm -rf .next node_modules/.cache node_modules
npm install
npm run build
pkill -f "next" 2>/dev/null || true
npm run start > /tmp/tempo.log 2>&1 &
sleep 4
if [ -n "$FEED_URL" ]; then
  curl -s -X GET "http://localhost:3000/api/feed/sync?url=$FEED_URL" || true
fi
echo "✓ Готово! Открой http://93.189.230.214:3000/"
