# API Documentation

## Feed Synchronization

### GET /api/feed/sync (рекомендуется)
Синхронизирует фид в MongoDB. Шахматка читает данные из этой БД.

- **Без параметров:** используется `FEED_URL` из `.env` (на сервере или при `npm run dev`).
- **С параметром:** `?url=https://...` — явный URL фида.

**Примеры:**
```bash
# Если в .env задан FEED_URL (локально или на сервере)
curl -s "http://localhost:3000/api/feed/sync"

# Или с явным URL (подставьте свой)
curl -s "http://localhost:3000/api/feed/sync?url=https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5"
```

**Ответ при успехе (200):**
```json
{ "success": true, "totalBuildings": 4, "totalUnits": 1228 }
```

**Ошибка 400** — не передан `url` и не задан `FEED_URL` в `.env`.

### Скрипт из терминала
Из корня проекта (приложение должно быть запущено, в `.env` задан `FEED_URL`):
```bash
chmod +x scripts/sync-feed.sh
./scripts/sync-feed.sh
# На удалённом сервере:
./scripts/sync-feed.sh http://93.189.230.214
```

### GET /api/units
Returns all units from MongoDB, sorted by floor (descending) and number (ascending).

**Response:**
```json
[
  {
    "_id": "ObjectId",
    "id": "unit-1",
    "number": "101",
    "floor": 1,
    "price": 12500000,
    "area": 54.5,
    "pricePerM2": 229358,
    "rooms": 2,
    "view": "Двор",
    "section": "A",
    "status": "available",
    "status_humanized": "Свободно",
    "building_id": "building-1",
    "building_name": "Корпус 1",
    "floors_total": 25,
    "hasSpecialOffer": false
  }
]
```

### POST /api/units
Синхронизация фида (альтернатива GET /api/feed/sync). Тело можно не передавать — тогда используется `FEED_URL` из `.env`.

**Request (опционально):**
```json
{
  "feedUrl": "https://pb20127.profitbase.ru/export/profitbase_xml/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feed synced to database",
  "summary": { "totalBuildings": 4, "totalUnits": 1228 }
}
```

### GET /api/sync-feed
Manually sync a feed (useful for testing).

**Query Parameters:**
- `feedUrl` (required): URL to the feed XML file

**Example:**
```
GET /api/sync-feed?feedUrl=https://pb20127.profitbase.ru/export/profitbase_xml/...
```

**Response:**
```json
{
  "success": true,
  "buildingsCreated": 4,
  "buildingsUpdated": 0,
  "unitsCreated": 1228,
  "unitsUpdated": 0
}
```

## Supported Feed Formats

### Profitbase XML Format
Structure: `<realty-feed><offer>...</offer></realty-feed>`

Fields:
- `number`: Unit number (e.g., "А-101")
- `floor`: Floor number (int)
- `price/value`: Price in rubles
- `area/value`: Area in m²
- `price-meter/value`: Price per m²
- `rooms`: Number of rooms
- `window-view`: Window view (e.g., "Двор", "Парк")
- `status-humanized`: Status (e.g., "Свободно", "Продано")
- `image type="plan"`: Floor plan URL
- `house/name`: Building name
- `house/floors-total`: Total floors
- `house/ready-quarter`: Ready quarter (e.g., "Q4")
- `house/built-year`: Built year

### Domclick XML Format
Structure: `<complexes><complex><buildings><building><flats><flat>...</flat></flats></building></buildings></complex></complexes>`

Fields:
- `apartment`: Unit number
- `floor`: Floor number
- `price`: Price (direct, not in value tag)
- `area`: Area in m² (direct)
- `room`: Number of rooms
- `window_view`: Window view
- `plans/plan`: Array of floor plan URLs
- `building/name`: Building name
- `building/floors`: Total floors
- `ready_quarter`: Ready quarter
- `built_year`: Built year

## Status Mapping

Profitbase status "status-humanized" values are mapped to internal status:

| Profitbase Status | Internal Status |
|------------------|-----------------|
| Свободно / Свободный | available |
| Продано | sold |
| Не для продажи | closed_for_sale |
| Платная бронь | paid_reservation |
| Устная бронь | free_reservation |
| Оформление ДДУ | paid_reservation |
| Подписанный ДДУ | paid_reservation |
| (empty/not set) | available |

## MongoDB Collections

### buildings
```javascript
{
  _id: ObjectId,
  name: String,           // Building name
  floorsTotal: Number,    // Total floors
  handOverDate: String,   // e.g., "Q4 2026"
  createdAt: Date,
  updatedAt: Date
}
```

### units
```javascript
{
  _id: ObjectId,
  number: String,             // Unit number
  floor: Number,              // Floor number
  building_id: String,        // Reference to building
  building_name: String,      // Building name (denormalized)
  floors_total: Number,       // Total floors (denormalized)
  type: String,               // "2-к.кв", "Студия"
  rooms: Number,              // Number of rooms
  price: Number,              // Price in rubles
  area: Number,               // Area in m²
  pricePerM2: Number,         // Price per m²
  view: String,               // "Двор", "Парк"
  status: String,             // "available", "sold", etc.
  status_humanized: String,   // "Свободно", "Продано"
  layoutImage: String,        // Floor plan URL
  hasSpecialOffer: Boolean,   // Special offer flag
  specialOfferName: String,   // Special offer text
  createdAt: Date,
  updatedAt: Date
}
```

### feed_syncs
```javascript
{
  _id: ObjectId,
  feedUrl: String,
  status: String,              // "success" or "error"
  buildingsCreated: Number,
  buildingsUpdated: Number,
  unitsCreated: Number,
  unitsUpdated: Number,
  timestamp: Date
}
```

## Testing

### Синхронизация фида (один из способов)
```bash
# 1. Через GET /api/feed/sync (если в .env есть FEED_URL)
curl -s "http://localhost:3000/api/feed/sync"

# 2. С явным URL
curl -s "http://localhost:3000/api/feed/sync?url=https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5"

# 3. Через POST /api/units (тело пустое — возьмёт FEED_URL из .env)
curl -X POST http://localhost:3000/api/units -H "Content-Type: application/json" -d '{}'
```

### Get all units
```bash
curl http://localhost:3000/api/units
```

## Environment Variables

- **MONGODB_URI** — строка подключения к MongoDB. База: `tempo_nova`.
- **FEED_URL** — URL фида застройщика (Profitbase/Domclick). Нужен для авто-синка по cron и для POST /api/units без тела.

## Авто-обновление фида (cron)

Синк выполняется **только из БД** (как в real-estate). Чтобы фиды подтягивались сами с 8:00 до 23:00 каждые 30 минут, настройте на сервере cron:

1. В `.env` задайте `FEED_URL=https://...` (URL фида).
2. Добавьте задачу:
```bash
*/30 8-22 * * * curl -s "http://localhost:3000/api/cron/sync-feed"
```
(запуск в 8:00, 8:30, 9:00, … 22:30; не чаще раза в 30 мин).

Эндпоинт **GET /api/cron/sync-feed** сам проверяет время (8–23) и троттлинг 30 мин.
