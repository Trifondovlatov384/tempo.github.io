#!/bin/bash
set -e
cd /tmp/tempo.github.io
rm -rf .next node_modules/.cache
npm run build
npm run start &
sleep 4
if [ -n "$FEED_URL" ]; then
  curl -s -X GET "http://localhost:3000/api/feed/sync?url=$FEED_URL" || true
fi
echo "✓ Готово! Открой http://93.189.230.214:3000/tempo_nova/chess"
