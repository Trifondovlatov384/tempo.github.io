#!/usr/bin/env node

/**
 * Скрипт для загрузки фида Profitbase в MongoDB
 * Запускается локально и загружает реальные данные в БД
 */

import { MongoClient } from "mongodb";
import { parseProfitbaseXml, convertOffersToParsedFeed } from "./lib/profitbaseFeedParser.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://nikitavisitskiy_db_user:i4zCkdT80v9iUEgw@cluster0.loefhqo.mongodb.net/tempo_nova?appName=Cluster0";
const FEED_URL = "https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5";

async function loadFeedToDatabase() {
  console.log("🔄 Начинаем загрузку фида в MongoDB...\n");
  
  let client: MongoClient | null = null;
  
  try {
    // Подключаемся к MongoDB
    console.log("📡 Подключение к MongoDB...");
    client = new MongoClient(MONGODB_URI, {
      retryWrites: true,
      w: "majority",
    });
    
    await client.connect();
    console.log("✓ Подключено к MongoDB\n");
    
    const db = client.db("tempo_nova");
    
    // Загружаем фид с внешнего сервера
    console.log(`📥 Загрузка фида с ${FEED_URL}`);
    const feedResponse = await fetch(FEED_URL);
    
    if (!feedResponse.ok) {
      throw new Error(`Ошибка загрузки фида: ${feedResponse.statusText}`);
    }
    
    const xmlContent = await feedResponse.text();
    console.log(`✓ Фид загружен (${(xmlContent.length / 1024 / 1024).toFixed(2)} MB)\n`);
    
    // Парсим XML
    console.log("🔍 Парсинг XML...");
    const offers = await parseProfitbaseXml(xmlContent);
    console.log(`✓ Распарсено ${offers.length} офферов\n`);
    
    // Дедупликация
    console.log("🧹 Дедупликация данных...");
    const feedData = convertOffersToParsedFeed(offers);
    console.log(`✓ После дедупликации: ${feedData.units.length} юнитов в ${feedData.buildings.size} зданиях\n`);
    
    // Очищаем старые данные
    console.log("🗑️  Очистка старых данных из БД...");
    await db.collection("units").deleteMany({});
    console.log("✓ Старые данные удалены\n");
    
    // Загружаем в БД батчами
    console.log("💾 Загрузка данных в MongoDB...");
    const unitsCollection = db.collection("units");
    const chunkSize = 1000;
    
    let totalInserted = 0;
    for (let i = 0; i < feedData.units.length; i += chunkSize) {
      const chunk = feedData.units.slice(i, i + chunkSize);
      const unitsToInsert = chunk.map(unit => ({
        number: unit.number,
        floor: unit.floor,
        building: unit.building,
        building_name: unit.building,
        building_id: unit.building,
        section: unit.section,
        rooms: unit.rooms,
        price: unit.price,
        area: unit.area,
        pricePerM2: unit.pricePerM2,
        view: unit.view,
        status: unit.status,
        status_humanized: unit.statusHumanized,
        layoutImage: unit.layoutImage,
        hasSpecialOffer: unit.hasSpecialOffer,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      
      const result = await unitsCollection.insertMany(unitsToInsert);
      totalInserted += result.insertedCount;
      
      const progress = Math.min(i + chunkSize, feedData.units.length);
      console.log(`  ${progress}/${feedData.units.length} юнитов загружено`);
    }
    
    console.log(`\n✓ Всего загружено ${totalInserted} юнитов\n`);
    
    // Проверяем статистику
    console.log("📊 Статистика по зданиям:");
    const stats = await unitsCollection.aggregate([
      { $group: { _id: "$building_name", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    for (const stat of stats) {
      console.log(`  • ${stat._id}: ${stat.count} юнитов`);
    }
    
    console.log("\n✅ Загрузка завершена успешно!");
    console.log(`\nТеперь сайт подтянет данные из БД при перезагрузке.`);
    console.log(`Откройте: http://93.189.230.214/tempo_nova/chess`);
    
  } catch (error) {
    console.error("❌ Ошибка:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n📴 Отключено от MongoDB");
    }
  }
}

// Запускаем скрипт
loadFeedToDatabase().catch(console.error);
