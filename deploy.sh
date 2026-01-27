#!/bin/bash

# Tempo Nova - Deployment Script
# Используй: bash deploy.sh на сервере

set -e

echo "🚀 Развертывание Tempo Nova на сервер..."

# Переменные
REPO_URL="https://github.com/Trifondovlatov384/tempo.github.io.git"
APP_DIR="/home/app/tempo-nova"
NODE_VERSION="20"
PORT=3000

# 1. Установка зависимостей
echo "📦 Установка зависимостей системы..."
apt-get update
apt-get install -y curl git nodejs npm

# 2. Создание директории приложения
echo "📁 Создание директории приложения..."
mkdir -p $APP_DIR
cd $APP_DIR

# 3. Клонирование репозитория
echo "📥 Клонирование репозитория..."
if [ ! -d ".git" ]; then
  git clone $REPO_URL .
else
  git pull origin main
fi

# 4. Установка зависимостей Node.js
echo "📚 Установка npm пакетов..."
npm install --production=false

# 5. Сборка приложения
echo "🔨 Сборка приложения..."
npm run build

# 6. Настройка PM2 (для запуска в фоне)
echo "⚙️  Настройка PM2..."
npm install -g pm2

# 7. Стартовый скрипт PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tempo-nova',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# 8. Запуск приложения с PM2
echo "🎯 Запуск приложения..."
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 9. Настройка Nginx (обратный прокси)
echo "🌐 Настройка Nginx..."
apt-get install -y nginx

cat > /etc/nginx/sites-available/tempo-nova << 'EOF'
server {
    listen 80;
    server_name 93.189.230.214;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/tempo-nova /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "✅ Развертывание завершено!"
echo "🎉 Приложение доступно на http://93.189.230.214"
echo "📝 Логи: pm2 logs"
echo "🔄 Перезагрузка: pm2 restart all"
