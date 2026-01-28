#!/bin/bash

# Простой тест API - загрузить фид и проверить результат

echo "=== Проверяем GET /api/units ===" 
curl -s "http://localhost:3000/api/units" | python3 -c "import sys, json; units=json.load(sys.stdin); print(f'Юнитов в БД: {len(units)}'); print(f'Зданий: {len(set(u.get(\"building\", \"Unknown\") for u in units))}' if units else 'БД пуста')" 2>/dev/null

echo ""
echo "=== Загрузка фида ===" 
echo "Отправляем запрос на загрузку фида..."

# Используем curl с более длинным таймаутом
timeout 300 curl -X POST "http://localhost:3000/api/units" \
  -H "Content-Type: application/json" \
  -d '{"feedUrl":"https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5"}' \
  -s | python3 -c "import sys, json; r=json.load(sys.stdin); print(json.dumps(r, indent=2, ensure_ascii=False))" 2>/dev/null || echo "Таймаут или ошибка"

echo ""
echo "=== Проверяем результат ===" 
sleep 2
curl -s "http://localhost:3000/api/units" | python3 -c "import sys, json; units=json.load(sys.stdin); print(f'✓ Юнитов в БД: {len(units)}'); print(f'✓ Зданий: {len(set(u.get(\"building\", \"Unknown\") for u in units))}' if units else 'БД остаётся пуста')" 2>/dev/null
