# Как исправить ошибку 404 на доменах

Проблема: Браузер пытается загружать ресурсы с `https://trifondovlatov384.github.io/` вместо вашего сервера.

## Решение 1: Очистить кэш браузера
1. Откройте DevTools (F12)
2. Right-click на кнопку reload
3. Выберите "Empty cache and hard reload"
4. Обновите страницу

## Решение 2: Проверить адрес в адресной строке
Убедитесь, что вы открываете сайт с:
- **Правильно:** `http://93.189.230.214/tempo_nova/chess`
- **Неправильно:** `https://trifondovlatov384.github.io/...`

## Решение 3: Пересобрать приложение на сервере
Если всё равно не работает, выполните на сервере:

```bash
cd /home/app/tempo-nova
git reset --hard origin/main
rm -rf .next node_modules/.cache
npm install
npm run build
pm2 restart tempo-nova
```

## Решение 4: Проверить что сервер работает
```bash
curl -I http://93.189.230.214/tempo_nova/chess
```

Должен вернуть 200 OK.

## Если ничего не помогает:
1. Проверьте что приложение запущено: `pm2 status`
2. Посмотрите логи: `pm2 logs tempo-nova --lines 50`
3. Проверьте что Nginx работает: `systemctl status nginx`
