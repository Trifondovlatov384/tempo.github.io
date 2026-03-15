import { spawnSync } from "child_process";
import { join } from "path";
import { MongoClient } from "mongodb";
import {
  parseProfitbaseXml,
  convertOffersToParsedFeed,
} from "./parser";

export type SyncResult = {
  success: boolean;
  totalBuildings: number;
  totalUnits: number;
  error?: string;
};

const FEED_MAX_BYTES = 60 * 1024 * 1024; // 60 MB буфер для stdout

/**
 * Топорный вариант: качаем фид через отдельный процесс (npx tsx scripts/feed-fetch-stdout.ts).
 * В этом процессе на VPS TLS работает; из Next.js API — падает. XML приходит в stdout.
 */
function fetchFeedViaSubprocess(feedUrl: string): string {
  const trimmed = feedUrl.trim();
  if (!trimmed.startsWith("http")) {
    throw new Error(`FEED_URL должен быть http или https. Получено: ${trimmed.slice(0, 20)}...`);
  }

  const scriptPath = join(process.cwd(), "scripts", "feed-fetch-stdout.ts");
  const result = spawnSync("npx", ["tsx", scriptPath], {
    env: { ...process.env, FEED_URL: trimmed },
    encoding: "utf8",
    maxBuffer: FEED_MAX_BYTES,
    timeout: 90000,
  });

  if (result.status !== 0) {
    const err = result.stderr?.trim() || result.error?.message || `exit ${result.status}`;
    throw new Error(`Не удалось загрузить фид: ${err}`);
  }

  const xml = result.stdout ?? "";
  if (!xml.includes("<")) {
    throw new Error("Пустой или неверный ответ фида");
  }
  return xml;
}

/**
 * Синхронизация фида в БД. Один Profitbase: feedUrl из .env.
 * Загрузка фида — через subprocess (работает на VPS), запись — нативный MongoDB.
 */
function getDbUri(): string | undefined {
  return process.env.DATABASE_URL || process.env.MONGODB_URI;
}

export async function runFeedSync(feedUrl: string): Promise<SyncResult> {
  const uri = getDbUri();
  if (!uri) {
    return {
      success: false,
      totalBuildings: 0,
      totalUnits: 0,
      error: "DATABASE_URL (или MONGODB_URI) не задан в .env",
    };
  }

  let client: MongoClient | null = null;
  try {
    const xmlContent = fetchFeedViaSubprocess(feedUrl);
    const offers = await parseProfitbaseXml(xmlContent);
    const feedData = convertOffersToParsedFeed(offers);

    const buildingFloors = new Map<string, number>();
    feedData.buildings.forEach((b, name) => {
      buildingFloors.set(name, b.floorsTotal);
    });

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    await client.connect();
    const db = client.db();
    const coll = db.collection("units");

    await coll.deleteMany({});

    const chunkSize = 500;
    const units = feedData.units;
    const LIMIT = 100_000;
    const toInsert = units.slice(0, LIMIT);

    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const docs = chunk.map((unit) => ({
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
        hasSpecialOffer: unit.hasSpecialOffer ?? false,
        floors_total: buildingFloors.get(unit.building) ?? 25,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await coll.insertMany(docs);
    }

    return {
      success: true,
      totalBuildings: feedData.buildings.size,
      totalUnits: toInsert.length,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("runFeedSync error:", error);
    return {
      success: false,
      totalBuildings: 0,
      totalUnits: 0,
      error,
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}
