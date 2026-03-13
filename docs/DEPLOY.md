# Деплой на GitHub и VPS

Деплой на гитхаб: 

git add .
git commit -m "Tempo: шахматка, фид, деплой"
git remote add origin https://github.com/Trifondovlatov384/tempo.github.io
git branch -M main
git push -u origin main

## 1. Публикация кода на GitHub

В корне проекта выполните:

```bash
# Инициализация (если ещё не сделано)
git init

# Добавить все файлы ( .env в .gitignore — в репозиторий не попадёт)
git add .
git commit -m "Tempo: шахматка, фид, Prisma, MongoDB"

# Подключить свой репозиторий и отправить код
git remote add origin https://github.com/Trifondovlatov384/tempo.github.io
git branch -M main
git push -u origin main
```

---

## 2. Что такое Nginx и почему 502

**Nginx** — это веб‑сервер: программа, которая принимает запросы по адресу твоего сайта (по IP или домену) и отдаёт ответ. Сам по себе он только «принимает гостей» на порт 80 (http) или 443 (https).

Твоё приложение (Next.js) работает **отдельно** — как программа на порту 3000. Nginx настроен так: «когда приходит запрос на мой 80 порт — переправь его на localhost:3000». То есть пользователь заходит по `http://93.189.230.214`, Nginx получает запрос и передаёт его твоему приложению на 3000.

**502 Bad Gateway** значит: Nginx получил запрос, попытался передать его приложению на порт 3000, но **не получил нормальный ответ**. Обычно это бывает, когда:

1. Приложение **не запущено** (никто не слушает порт 3000).
2. Сборка не прошла, папки `.next` нет — тогда `npm run start` не может запустить продакшен.
3. Приложение упало или зависло.

**Что делать:** убедиться, что на сервере выполнен `npm run build`, затем запущено приложение (например, через PM2). Когда на 3000 порту снова отвечает Next.js — 502 пропадёт и сайт откроется.

### Если уже висит 502 и были ошибки при build

**Важно:** все команды выполняй из **каталога приложения**, где лежат `app/`, `package.json`, `prisma/`. На сервере это **ровно один каталог**: `/home/app/tempo-nova`.

1. Подтяни последний код с GitHub (в нём исправлена ошибка сборки в cron и добавлен скрипт `seed`):
   ```bash
   cd /home/app/tempo-nova
   git fetch origin
   git reset --hard origin/main
   ```
   (`reset --hard` подтягивает точную копию с GitHub; .env не трогается.)

2. **Проверь, что подтянулся правильный файл** (в нём не должно быть строки с `*/30` и блочного комментария):
   ```bash
   head -6 app/api/cron/sync-feed/route.ts
   ```
   Ожидаемо: сначала пустая строка или однострочный комментарий, затем `import { runFeedSync }...`. Если видишь `* Вызов синка` и `*/30` — сборка собирает код из **другой папки** (см. пункт 2а).

2а. **Если в ошибке сборки путь указан как `./tempo.github.io/app/...`** — Next собирает код из подпапки `tempo.github.io`. Подтяни код и собери именно там:
   ```bash
   cd /home/app/tempo-nova/tempo.github.io
   git fetch origin
   git reset --hard origin/main
   npm install
   npm run build
   ```
   Дальше запуск/рестарт PM2 делай из этой же папки. Либо приведи структуру к одной папке: оставь репозиторий только в `/home/app/tempo-nova` (без вложенного `tempo.github.io`) и собирай из него.

3. Установи зависимости (в т.ч. tsx для seed):
   ```bash
   cd /home/app/tempo-nova
   npm install
   ```
4. Собери проект:
   ```bash
   npm run build
   ```
5. Запусти приложение через PM2 (если ещё не запущено):
   ```bash
   pm2 start npm --name "tempo-nova" -- start
   pm2 save
   ```
   Если уже запускал раньше — просто перезапусти после успешного build:
   ```bash
   pm2 restart tempo-nova
   ```
6. Проверь: открой в браузере `http://93.189.230.214` — должна открыться шахматка (пустая или с данными). 502 исчезнет, когда приложение на порту 3000 снова отвечает.
7. Один раз заполнить БД (на VPS скрипт seed должен быть в package.json после pull):
   ```bash
   npm run seed
   ```
   Либо на открытом сайте нажать «Обновить фид».

---

## 3. Деплой на VPS

На сервере (Ubuntu/Debian) выполните по шагам.

### 3.1. Установка Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # должно быть v20.x или выше
```

### 3.2. Клонирование и настройка проекта

```bash
cd /home
sudo mkdir -p app && sudo chown $USER:$USER app
cd app
git clone https://github.com/Trifondovlatov384/tempo.github.io tempo-nova
cd tempo-nova
```

### 3.3. Переменные окружения

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

### 3.4. Сборка и первый запуск

```bash
npm install
npm run build
npm run start
```

Проверьте в браузере: `http://IP_ВАШЕГО_СЕРВЕРА:3000`. Должна открыться шахматка (пустая или с данными).

Остановить сервер: Ctrl+C.

### 3.5. Заполнение БД (один раз)

На VPS обычно нет проблем с SSL. Выполните один раз:

```bash
cd /home/app/tempo-nova
npm run seed
```

Либо откройте сайт и нажмите «Обновить фид» — данные подтянутся из FEED_URL.

#### Как устроена загрузка фида (SSL на VPS)

Запрос к Profitbase из процесса Next.js на VPS падал с SSL. Поэтому фид качается **отдельным процессом**: при нажатии «Обновить фид» приложение запускает `npx tsx scripts/feed-fetch-stdout.ts` (тот же код, что в тесте), получает XML из stdout и пишет в БД. В этом процессе TLS работает. На VPS нужен полный `npm install` (без `--omit=dev`), чтобы были установлены `tsx` и `dotenv`.

### 3.6. Постоянный запуск через PM2

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

### 3.7. Автообновление фида каждые 10 минут (cron)

```bash
crontab -e
```

Добавьте строку (подставьте свой URL или оставьте без параметра, если в .env задан FEED_URL):

```
*/10 * * * * curl -s "http://127.0.0.1:3000/api/feed/sync" > /dev/null 2>&1
```

Сохраните. Каждые 10 минут будет вызываться синхронизация фида.

### 3.8. Nginx (чтобы открывать сайт по 80 порту)

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

## 4. Обновление после изменений в GitHub

На VPS:

```bash
cd /home/app/tempo-nova
git pull origin main
npm install
npm run build
pm2 restart tempo-nova
```

---

## 5. Локальные ошибки SSL (Mac/Windows)

Ошибка `ssl3_read_bytes:tlsv1 alert internal error` при `npm run seed` или при открытии сайта локально обычно связана с окружением (Node/OpenSSL, файрвол, VPN). На VPS с Linux и актуальным Node 20+ такого чаще всего нет.

Что можно сделать локально:

- Установить Node 20 или 22 с [nodejs.org](https://nodejs.org).
- В `.env` обязательно указать `FEED_URL=https://...profitbase.ru/export/...` (фид загружается только по URL).
- Заполнять БД на сервере: после деплоя выполнить `npm run seed` или нажать «Обновить фид» на сайте.
