# Деплой на GitHub и VPS

## 1. Публикация кода на GitHub

В корне проекта выполните:

```bash
# Инициализация (если ещё не сделано)
git init

# Добавить все файлы ( .env в .gitignore — в репозиторий не попадёт)
git add .
git commit -m "Tempo: шахматка, фид, Prisma, MongoDB"

# Подключить свой репозиторий и отправить код
git remote add origin https://github.com/ВАШ_ЛОГИН/ВАШ_РЕПОЗИТОРИЙ.git
git branch -M main
git push -u origin main
```

Замените `ВАШ_ЛОГИН` и `ВАШ_РЕПОЗИТОРИЙ` на свои. Репозиторий можно создать на [github.com](https://github.com/new) (пустой, без README).

---

## 2. Деплой на VPS

На сервере (Ubuntu/Debian) выполните по шагам.

### 2.1. Установка Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # должно быть v20.x или выше
```

### 2.2. Клонирование и настройка проекта

```bash
cd /home
sudo mkdir -p app && sudo chown $USER:$USER app
cd app
git clone https://github.com/ВАШ_ЛОГИН/ВАШ_РЕПОЗИТОРИЙ.git tempo-nova
cd tempo-nova
```

### 2.3. Переменные окружения

```bash
cp .env.example .env
nano .env
```

Заполните в `.env`:

- **MONGODB_URI** — строка подключения к MongoDB Atlas (или своей MongoDB).  
  В Atlas: Network Access → добавьте IP сервера (или 0.0.0.0/0 для теста).
- **FEED_URL** — URL фида Profitbase, например:  
  `https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5`

Сохраните файл (Ctrl+O, Enter, Ctrl+X).

### 2.4. Сборка и первый запуск

```bash
npm install
npm run build
npm run start
```

Проверьте в браузере: `http://IP_ВАШЕГО_СЕРВЕРА:3000`. Должна открыться шахматка (пустая или с данными).

Остановить сервер: Ctrl+C.

### 2.5. Заполнение БД (один раз)

На VPS обычно нет проблем с SSL. Выполните один раз:

```bash
cd /home/app/tempo-nova
npm run seed
```

Либо откройте сайт и нажмите «Обновить фид» — данные подтянутся из FEED_URL.

### 2.6. Постоянный запуск через PM2

```bash
sudo npm install -g pm2
cd /home/app/tempo-nova
pm2 start npm --name "tempo-nova" -- start
pm2 save
pm2 startup   # команду из вывода выполните от root
```

Дальнейшие команды:

- `pm2 status` — статус
- `pm2 logs tempo-nova` — логи
- `pm2 restart tempo-nova` — перезапуск

### 2.7. Автообновление фида каждые 10 минут (cron)

```bash
crontab -e
```

Добавьте строку (подставьте свой URL или оставьте без параметра, если в .env задан FEED_URL):

```
*/10 * * * * curl -s "http://127.0.0.1:3000/api/feed/sync" > /dev/null 2>&1
```

Сохраните. Каждые 10 минут будет вызываться синхронизация фида.

### 2.8. Nginx (опционально, чтобы открывать по 80 порту)

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/tempo
```

Вставьте (замените `ВАШ_ДОМЕН` или используйте `_` для default_server):

```nginx
server {
    listen 80 default_server;
    server_name ВАШ_ДОМЕН _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Включите сайт и перезапустите nginx:

```bash
sudo ln -s /etc/nginx/sites-available/tempo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Сайт будет доступен по `http://IP_СЕРВЕРА` или по домену.

---

## 3. Обновление после изменений в GitHub

На VPS:

```bash
cd /home/app/tempo-nova
git pull origin main
npm install
npm run build
pm2 restart tempo-nova
```

---

## 4. Локальные ошибки SSL (Mac/Windows)

Ошибка `ssl3_read_bytes:tlsv1 alert internal error` при `npm run seed` или при открытии сайта локально обычно связана с окружением (Node/OpenSSL, файрвол, VPN). На VPS с Linux и актуальным Node 20+ такого чаще всего нет.

Что можно сделать локально:

- Установить Node 20 или 22 с [nodejs.org](https://nodejs.org).
- В `.env` временно поставить `FEED_URL=file://feed.xml` и положить выгрузку фида в файл `feed.xml` в корне — seed будет читать только из файла (подключение к MongoDB при этом всё равно нужно).
- Заполнять БД уже на сервере: задеплоить проект и выполнить там `npm run seed` или нажать «Обновить фид» на сайте.
