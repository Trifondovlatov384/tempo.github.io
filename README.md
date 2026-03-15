# tempo.github.io
tempo nova chess

## Требования

- **Node.js 20+** (рекомендуется 22 LTS). Обновление: `nvm install 22 && nvm use 22` (если используете nvm) или скачайте с [nodejs.org](https://nodejs.org).

## Установка

```bash
npm install
npm run prisma:generate   # если postinstall не сработал
npm run dev
```

В `.env` задайте `DATABASE_URL` (подключение к MongoDB Atlas) и при необходимости `FEED_URL`.

## Заполнение БД из фида

Один раз загрузить данные: `npm run seed` или на сайте нажать «Обновить фид».

**Важно:** при открытии сайта шахматка всегда отображается (с данными или пустая). Если БД пуста или нет подключения — показывается пустая сетка и кнопка «Обновить фид».

## Деплой на GitHub и VPS

Подробная инструкция: **[DEPLOY.md](DEPLOY.md)** — публикация на GitHub, установка на VPS, PM2, Nginx, cron для обновления фида каждые 10 минут.

## Типичные проблемы

- **`EACCES: permission denied` при `npm install`** — права на кэш npm. Выполните:
  ```bash
  sudo chown -R $(whoami) ~/.npm
  ```
  либо очистите кэш: `npm cache clean --force`, затем снова `npm install`.

- **Prisma: "The datasource property \`url\` is no longer supported"** — глобально установлена Prisma 7, а в проекте используется Prisma 5. Запускайте генерацию так:
  ```bash
  npm run prisma:generate
  ```
  (скрипт явно вызывает `prisma@5.22.0`).
