#!/bin/bash

# Быстрая пересборка на сервере
# Выполните на сервере: bash -c "$(curl -fsSL https://raw.githubusercontent.com/Trifondovlatov384/tempo.github.io/main/rebuild.sh)"

cd /home/app/tempo-nova || exit 1

echo "🔄 Обновляю код..."
git pull origin main

echo "🗑️ Удаляю кэши..."
rm -rf .next

echo "📦 npm install..."
npm install

echo "🔨 npm build..."
npm run build

echo "🔄 Перезагружаю приложение..."
pm2 restart tempo-nova

echo "✅ Готово! Проверяю статус..."
pm2 status
