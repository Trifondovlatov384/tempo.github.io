#!/bin/bash

set -e

echo "🚀 Развертывание Tempo Nova..."

REPO_URL="https://github.com/Trifondovlatov384/tempo.github.io.git"
APP_DIR="/home/app/tempo-nova"

echo "📦 Установка зависимостей..."
apt-get update && apt-get install -y curl git nodejs npm nginx

echo "📁 Создание директории..."
mkdir -p $APP_DIR
cd $APP_DIR

echo "📥 Клонирование репозитория..."
if [ ! -d ".git" ]; then
  git clone $REPO_URL .
else
  git pull origin main
fi

echo "📚 Установка npm пакетов..."
npm install

echo "🔨 Сборка приложения..."
npm run build

echo "📝 Создание директории логов..."
mkdir -p logs

echo "⚙️  Установка PM2..."
npm install -g pm2

echo "🎯 Запуск приложения..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tempo-nova',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 },
    error_file: './logs/error.log',
    out_file: './logs/out.log'
  }]
};
EOF

pm2 delete tempo-nova 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 startup
pm2 save

echo "🌐 Настройка Nginx..."
cat > /etc/nginx/sites-available/tempo-nova << 'NGINX'
upstream app { server 127.0.0.1:3000; }
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  
  gzip on;
  gzip_types text/plain text/css text/javascript application/json;
  
  location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/tempo-nova /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
systemctl enable nginx

echo ""
echo "✅ Готово!"
echo "🌐 Откройте: http://93.189.230.214"
echo "📝 Логи: pm2 logs"
