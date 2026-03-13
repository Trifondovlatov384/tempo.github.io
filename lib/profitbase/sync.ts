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

const FEED_TIMEOUT_MS = 60000;
const FEED_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// Загрузка фида по URL — обычный fetch (референс: feed_help.txt). Таймаут 60 с, лимит 50 MB, Accept: application/xml, text/xml. Без axios и без кастомного HTTPS-агента.
async function fetchFeedFromUrl(feedUrl: string): Promise<string> {
  const trimmed = feedUrl.trim();
  const url = new URL(trimmed);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `FEED_URL должен быть http или https. Получено: ${url.protocol}`
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  const res = await fetch(trimmed, {
    signal: controller.signal,
    headers: {
      Accept: "application/xml, text/xml, */*",
    },
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Feed HTTP ${res.status}`);
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength) {
    const len = parseInt(contentLength, 10);
    if (!Number.isNaN(len) && len > FEED_MAX_BYTES) {
      throw new Error(
        `Размер фида превышает лимит 50 MB: ${(len / 1024 / 1024).toFixed(1)} MB`
      );
    }
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Нет тела ответа");
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.length > FEED_MAX_BYTES) {
        reader.cancel();
        throw new Error(
          `Размер фида превышает лимит 50 MB (получено ≥ ${(total / 1024 / 1024).toFixed(1)} MB)`
        );
      }
      chunks.push(value);
      total += value.length;
    }
  } finally {
    reader.releaseLock();
  }

  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(
    chunks.length === 1 ? chunks[0] : concatUint8Arrays(chunks)
  );
  const firstTag = text.indexOf("<");
  if (firstTag > 0) {
    return text.slice(firstTag);
  }
  return text;
}

function concatUint8Arrays(arr: Uint8Array[]): Uint8Array {
  const total = arr.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arr) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * Синхронизация фида в БД. Один Profitbase: feedUrl из .env.
 * Запись через нативный MongoDB (без транзакций), т.к. Atlas M0 не поддерживает transactions.
 */
export async function runFeedSync(feedUrl: string): Promise<SyncResult> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      success: false,
      totalBuildings: 0,
      totalUnits: 0,
      error: "MONGODB_URI не задан в .env",
    };
  }

  let client: MongoClient | null = null;
  try {
    const xmlContent = await fetchFeedFromUrl(feedUrl);
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
