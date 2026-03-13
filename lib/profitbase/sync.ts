import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { join } from "path";
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

/** Читает XML: по URL или из локального файла (file://feed.xml / file:feed.xml). */
async function loadFeedXml(feedUrl: string): Promise<string> {
  const fileMatch = /^file:\/?\/*(.+)$/.exec(feedUrl.trim());
  if (fileMatch) {
    const path = join(process.cwd(), fileMatch[1].replace(/^\/+/, ""));
    let raw = readFileSync(path, "utf-8");
    const firstTag = raw.indexOf("<");
    if (firstTag > 0) {
      raw = raw.slice(firstTag);
    }
    return raw;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const res = await fetch(feedUrl, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) {
    throw new Error(`Feed HTTP ${res.status}`);
  }
  return res.text();
}

/**
 * Синхронизация фида в БД. Запись через нативный MongoDB (без транзакций),
 * т.к. Atlas M0 и др. не поддерживают transactions.
 */
export async function runFeedSync(feedUrl: string): Promise<SyncResult> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      success: false,
      totalBuildings: 0,
      totalUnits: 0,
      error: "MONGODB_URI is not set",
    };
  }

  let client: MongoClient | null = null;
  try {
    const xmlContent = await loadFeedXml(feedUrl);
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
    for (let i = 0; i < units.length; i += chunkSize) {
      const chunk = units.slice(i, i + chunkSize);
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
      totalUnits: feedData.units.length,
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
