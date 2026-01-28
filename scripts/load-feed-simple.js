#!/usr/bin/env node
/**
 * Простой Node.js скрипт для загрузки фида в MongoDB
 * Использование: node scripts/load-feed-simple.js
 */

const { MongoClient } = require('mongodb');
const { parseStringPromise } = require('xml2js');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://nikitavisitskiy_db_user:i4zCkdT80v9iUEgw@cluster0.loefhqo.mongodb.net/tempo_nova?appName=Cluster0";
const FEED_URL = "https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5";

// Простой парсер для Profitbase XML
async function parseOffers(xmlContent) {
  const parsed = await parseStringPromise(xmlContent);
  const offers = parsed["realty-feed"].offer || [];
  const result = [];

  offers.forEach((offer) => {
    try {
      const house = offer.house?.[0] || {};
      const houseName = house.name?.[0] || "Unknown";
      const houseFloorsTotal = parseInt(house["floors-total"]?.[0] || "0", 10);

      const number = offer.number?.[0] || "";
      const floor = parseInt(offer.floor?.[0] || "0", 10);
      const price = parseFloat(offer.price?.[0]?.value?.[0] || "0");
      const area = parseFloat(offer.area?.[0]?.value?.[0] || "0");
      const pricePerM2 = parseFloat(offer["price-meter"]?.[0]?.value?.[0] || "0");
      const rooms = parseInt(offer.rooms?.[0] || "0", 10);
      const view = offer["window-view"]?.[0] || "";
      const statusHumanized = offer["status-humanized"]?.[0] || "Свободно";

      result.push({
        number,
        floor,
        houseName,
        houseFloorsTotal,
        rooms,
        price,
        area,
        pricePerM2,
        view,
        statusHumanized,
      });
    } catch (error) {
      console.warn("Error parsing offer:", error.message);
    }
  });

  return result;
}

// Дедупликация
function deduplicateOffers(offers) {
  const map = new Map();
  
  offers.forEach((offer) => {
    const key = `${offer.houseName}:${offer.number}`;
    map.set(key, offer);
  });
  
  return Array.from(map.values());
}

// Маппинг статуса
function mapStatus(statusHumanized) {
  const status = statusHumanized?.toLowerCase() || "";
  if (status.includes("свобод")) return "available";
  if (status.includes("продан")) return "sold";
  if (status.includes("платная")) return "paid_reservation";
  if (status.includes("устная")) return "free_reservation";
  return "available";
}

async function main() {
  console.log("🔄 Начинаем загрузку фида в MongoDB...\n");

  let client = null;

  try {
    // Подключаемся к MongoDB
    console.log("📡 Подключение к MongoDB...");
    client = new MongoClient(MONGODB_URI, {
      retryWrites: true,
      w: "majority",
      tlsInsecure: true, // Отключаем проверку SSL сертификата
      ssl: true,
    });

    await client.connect();
    console.log("✓ Подключено к MongoDB\n");

    const db = client.db("tempo_nova");

    // Загружаем фид
    console.log(`📥 Загрузка фида с сервера...`);
    const feedResponse = await fetch(FEED_URL);

    if (!feedResponse.ok) {
      throw new Error(`Ошибка загрузки фида: ${feedResponse.statusText}`);
    }

    const xmlContent = await feedResponse.text();
    const sizeMB = (xmlContent.length / 1024 / 1024).toFixed(2);
    console.log(`✓ Фид загружен (${sizeMB} MB)\n`);

    // Парсим XML
    console.log("🔍 Парсинг XML...");
    const offers = await parseOffers(xmlContent);
    console.log(`✓ Распарсено ${offers.length} офферов\n`);

    // Дедупликация
    console.log("🧹 Дедупликация данных...");
    const uniqueOffers = deduplicateOffers(offers);
    console.log(`✓ После дедупликации: ${uniqueOffers.length} юнитов\n`);

    // Группируем по зданиям
    const byBuilding = new Map();
    uniqueOffers.forEach((offer) => {
      if (!byBuilding.has(offer.houseName)) {
        byBuilding.set(offer.houseName, []);
      }
      byBuilding.get(offer.houseName).push(offer);
    });

    console.log(`✓ Найдено ${byBuilding.size} зданий\n`);

    // Очищаем старые данные
    console.log("🗑️  Очистка старых данных из БД...");
    await db.collection("units").deleteMany({});
    console.log("✓ Старые данные удалены\n");

    // Загружаем в БД
    console.log("💾 Загрузка данных в MongoDB...");
    const unitsCollection = db.collection("units");

    let totalInserted = 0;
    for (const [buildingName, buildingOffers] of byBuilding) {
      console.log(`\n  📦 ${buildingName}: ${buildingOffers.length} юнитов`);

      const unitsToInsert = buildingOffers.map((offer) => ({
        number: offer.number,
        floor: offer.floor,
        building: offer.houseName,
        building_name: offer.houseName,
        building_id: offer.houseName,
        section: offer.houseName.charAt(0).toUpperCase(),
        rooms: offer.rooms,
        price: offer.price,
        area: offer.area,
        pricePerM2: offer.pricePerM2,
        view: offer.view,
        status: mapStatus(offer.statusHumanized),
        status_humanized: offer.statusHumanized,
        layoutImage: null,
        hasSpecialOffer: false,
        floors_total: offer.houseFloorsTotal,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await unitsCollection.insertMany(unitsToInsert);
      totalInserted += result.insertedCount;
      console.log(`    ✓ Загружено ${result.insertedCount} юнитов`);
    }

    console.log(`\n✅ Всего загружено ${totalInserted} юнитов в БД!\n`);

    // Статистика
    console.log("📊 Финальная статистика:");
    const stats = await unitsCollection.aggregate([
      { $group: { _id: "$building_name", count: { $sum: 1 }, floors: { $max: "$floor" } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    for (const stat of stats) {
      console.log(`  • ${stat._id}: ${stat.count} юнитов, макс. этаж ${stat.floors}`);
    }

    console.log("\n✅ Загрузка завершена!");
    console.log(`\n📍 Сайт доступен по адресу:`);
    console.log(`   http://93.189.230.214/tempo_nova/chess`);
    console.log(`\n🔄 Перезагрузите страницу в браузере для отображения данных\n`);

  } catch (error) {
    console.error("\n❌ Ошибка:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("📴 Отключено от MongoDB");
    }
  }
}

// Запускаем
main().catch(console.error);
