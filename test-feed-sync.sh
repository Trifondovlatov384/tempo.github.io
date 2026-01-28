#!/bin/bash

# Test MongoDB Connection and Sync Feed

set -e

echo "🔍 Testing MongoDB Feed Sync API..."
echo ""

# Check if MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  MONGODB_URI not set. Using default cluster URL."
    echo "   Make sure MongoDB is running and accessible."
fi

# Get the base URL
BASE_URL="${1:-http://localhost:3000}"
FEED_URL="https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5"

echo "📡 Base URL: $BASE_URL"
echo "🏢 Feed URL: $FEED_URL"
echo ""

# Test GET /api/units
echo "1️⃣  Testing GET /api/units..."
curl -s "$BASE_URL/api/units" | head -c 500 | jq . 2>/dev/null || echo "⚠️  Could not parse response as JSON"
echo ""
echo ""

# Sync feed
echo "2️⃣  Syncing feed from Profitbase..."
SYNC_RESULT=$(curl -s -X POST "$BASE_URL/api/units" \
  -H "Content-Type: application/json" \
  -d "{\"feedUrl\":\"$FEED_URL\"}")

echo "$SYNC_RESULT" | jq .

echo ""
echo "3️⃣  Verifying synced data..."
curl -s "$BASE_URL/api/units" | jq 'length' | xargs echo "Total units:"

echo ""
echo "✅ Feed sync test completed!"
