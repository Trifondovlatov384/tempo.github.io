#!/usr/bin/env bash
# Синхронизация фида из терминала.
# Использует FEED_URL из .env на сервере (приложение должно быть запущено).
# Локально: задайте FEED_URL в .env и запустите приложение (npm run dev).

set -e

BASE_URL="${1:-http://localhost:3000}"

echo "Синхронизация фида: $BASE_URL/api/feed/sync"
echo ""

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/feed/sync")
HTTP_BODY=$(echo "$RESP" | head -n -1)
HTTP_CODE=$(echo "$RESP" | tail -n 1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo "Готово. Обновите страницу шахматки."
elif [ "$HTTP_CODE" = "400" ]; then
  echo "Ошибка 400: не задан URL фида."
  echo "$HTTP_BODY" | jq -r '.error' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo "Варианты:"
  echo "  1. Задайте FEED_URL в .env и перезапустите приложение, затем снова: $0 $BASE_URL"
  echo "  2. Или укажите URL вручную: curl -s \"$BASE_URL/api/feed/sync?url=https://...\""
  exit 1
else
  echo "HTTP $HTTP_CODE"
  echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
  exit 1
fi
