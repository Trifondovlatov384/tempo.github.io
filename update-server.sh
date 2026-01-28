#!/bin/bash

echo "📍 Проверяю статус приложения..."
cd /home/app/tempo-nova

echo "📥 Обновляю репозиторий..."
git fetch origin main
git reset --hard origin/main

echo "📦 Устанавливаю зависимости..."
npm install 2>&1 | tail -5

echo "🔨 Собираю проект..."
npm run build 2>&1 | tail -20

echo "🔄 Перезагружаю приложение..."
pm2 delete tempo-nova || true
pm2 start "npm start" --name "tempo-nova" --instances 2 --exec-mode cluster
pm2 save

echo "✅ Готово!"
pm2 status
