/**
 * Синхронизация фида в БД (логика как в real-estate).
 * Только MongoDB, без кэша. Вызывается из POST /api/units и из cron.
 */
import { connectToDatabase } from "./mongodb";
import { parseProfitbaseXml, convertOffersToParsedFeed } from "./profitbaseFeedParser";

export type SyncResult = {
  success: boolean;
  totalBuildings: number;
  totalUnits: number;
  error?: string;
};

export async function runFeedSync(feedUrl: string): Promise<SyncResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const feedResponse = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!feedResponse.ok) {
      return {
        success: false,
        totalBuildings: 0,
        totalUnits: 0,
        error: `Feed HTTP ${feedResponse.status}`,
      };
    }

    const xmlContent = await feedResponse.text();
    const offers = await parseProfitbaseXml(xmlContent);
    const feedData = convertOffersToParsedFeed(offers);

    const { db } = await connectToDatabase();

    // Собираем floorsTotal по корпусам для записи в юниты
    const buildingFloors = new Map<string, number>();
    feedData.buildings.forEach((b, name) => {
      buildingFloors.set(name, b.floorsTotal);
    });

    await db.collection("units").deleteMany({});

    const chunkSize = 1000;
    const units = feedData.units;
    for (let i = 0; i < units.length; i += chunkSize) {
      const chunk = units.slice(i, i + chunkSize);
      const unitsToInsert = chunk.map((unit) => ({
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
      await db.collection("units").insertMany(unitsToInsert);
    }

    return {
      success: true,
      totalBuildings: feedData.buildings.size,
      totalUnits: feedData.units.length,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("runFeedSync error:", error);
    return { success: false, totalBuildings: 0, totalUnits: 0, error };
  }
}
