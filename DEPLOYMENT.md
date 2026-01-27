# 📋 Инструкция развертывания на сервере

## Данные сервера
- IP: 93.189.230.214
- Root password: kd3GGSSwz

## Шаг 1: Подключение к серверу

```bash
ssh root@93.189.230.214
# Введи пароль: kd3GGSSwz
```

## Шаг 2: Автоматическое развертывание

```bash
cd /tmp
git clone https://github.com/Trifondovlatov384/tempo.github.io.git
cd tempo.github.io
chmod +x deploy.sh
sudo bash deploy.sh
```

Скрипт автоматически установит и настроит:
- Node.js 20
- npm пакеты
- Сборку приложения
- PM2 (управление процессом)
- Nginx (веб-сервер)

## Шаг 3: Проверка статуса

```bash
pm2 status
pm2 logs tempo-nova
```

## Шаг 4: Доступ к приложению

После завершения развертывания сайт будет доступен на:
**http://93.189.230.214**

## Полезные команды

```bash
# Просмотр логов
pm2 logs tempo-nova

# Перезагрузка приложения
pm2 restart tempo-nova

# Остановка
pm2 stop tempo-nova

# Запуск
pm2 start tempo-nova

# Удаление из PM2
pm2 delete tempo-nova
```

## Если нужно обновить код

```bash
cd /home/app/tempo-nova
git pull origin main
npm install
npm run build
pm2 restart tempo-nova
```

## Альтернативное ручное развертывание (если скрипт не работает)

```bash
# 1. Подключись к серверу
ssh root@93.189.230.214

# 2. Установи зависимости
apt-get update
apt-get install -y curl git nodejs npm nginx

# 3. Клонируй репозиторий
mkdir -p /home/app
cd /home/app
git clone https://github.com/Trifondovlatov384/tempo.github.io.git tempo-nova
cd tempo-nova

# 4. Установи npm пакеты
npm install

# 5. Собери приложение
npm run build

# 6. Установи PM2 глобально
npm install -g pm2

# 7. Запусти приложение
pm2 start "npm start" --name "tempo-nova"
pm2 startup
pm2 save

# 8. Настрой Nginx как обратный прокси
# Создай файл /etc/nginx/sites-available/tempo-nova с содержимым:
# (смотри в deploy.sh)

# 9. Запусти Nginx
systemctl start nginx
systemctl enable nginx
```

## Поиск и решение проблем

### Порт 3000 занят
```bash
lsof -i :3000
kill -9 <PID>
```

### Ошибка при сборке
```bash
rm -rf node_modules .next
npm install
npm run build
```

### Nginx не перезагружается
```bash
nginx -t  # проверка синтаксиса
systemctl restart nginx
```
