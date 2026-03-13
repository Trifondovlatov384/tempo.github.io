import { MongoClient } from "mongodb";
import https from "https";
import axios from "axios";
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

// Cipher suites, совместимые с TLS 1.2 (Profitbase может не принимать TLS 1.3)
const TLS12_CIPHERS =
  "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";

/**
 * Загрузка фида по URL через axios с принудительным TLS 1.2 и SNI
 * (обход SSL alert internal_error на VPS при обращении к Profitbase).
 */
async function fetchFeedFromUrl(feedUrl: string): Promise<string> {
  const trimmed = feedUrl.trim();
  const url = new URL(trimmed);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `FEED_URL должен быть http или https. Получено: ${url.protocol}`
    );
  }

  const httpsAgent =
    url.protocol === "https:"
      ? new https.Agent({
          rejectUnauthorized: true,
          minVersion: "TLSv1.2",
          maxVersion: "TLSv1.2",
          servername: url.hostname,
          ciphers: TLS12_CIPHERS,
        })
      : undefined;

  const response = await axios.get(trimmed, {
    httpsAgent,
    timeout: FEED_TIMEOUT_MS,
    headers: {
      Accept: "application/xml, text/xml, */*",
      "User-Agent": "Mozilla/5.0 (compatible; NovaApp/1.0)",
    },
    maxContentLength: FEED_MAX_BYTES,
    maxBodyLength: FEED_MAX_BYTES,
    responseType: "text",
    validateStatus: (status) => status >= 200 && status < 400,
  });

  let text = typeof response.data === "string" ? response.data : String(response.data);
  const firstTag = text.indexOf("<");
  if (firstTag > 0) {
    text = text.slice(firstTag);
  }
  return text;
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
