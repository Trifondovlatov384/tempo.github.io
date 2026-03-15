import { cache } from "react";
import { appendFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db/prisma";

const DEBUG_LOG_PATH = join(process.cwd(), ".cursor", "debug-7d6a34.log");

export type TempoUnit = {
  id: string;
  number: string;
  rooms: number;
  floor: number;
  price: number;
  area: number;
  pricePerM2: number;
  view: string;
  section: string;
  status: string;
  statusHumanized: string;
  hasSpecialOffer: boolean;
  specialOfferName?: string;
  layoutImage?: string;
};

export type TempoBuilding = {
  id: string;
  name: string;
  floorsTotal: number;
  units: TempoUnit[];
};

export type TempoComplex = {
  id: "tempo-nova";
  name: string;
  buildings: TempoBuilding[];
};

export const getTempoData = cache(async (): Promise<TempoComplex | null> => {
  // #region agent log
  const _log = (msg: string, data: Record<string, unknown>) => {
    try {
      const line = JSON.stringify({ sessionId: "7d6a34", location: "getTempoData.ts", message: msg, data, timestamp: Date.now(), hypothesisId: "A_B_E" }) + "\n";
      appendFileSync(DEBUG_LOG_PATH, line);
    } catch (_) {}
  };
  // #endregion
  try {
    const dbUnits = await prisma.unit.findMany({
      orderBy: [{ floor: "desc" }, { number: "asc" }],
    });

    // #region agent log
    _log("after findMany", {
      dbUnitsLength: dbUnits.length,
      firstUnitKeys: dbUnits[0] ? Object.keys(dbUnits[0]) : [],
      firstUnitBuilding: dbUnits[0] ? (dbUnits[0] as { building?: string; buildingName?: string }).building : undefined,
      firstUnitBuildingName: dbUnits[0] ? (dbUnits[0] as { buildingName?: string }).buildingName : undefined,
    });
    // #endregion

    if (!dbUnits.length) {
      return null;
    }

    const buildingsMap = new Map<string, TempoBuilding>();

    for (const unit of dbUnits) {
      const buildingName =
        unit.buildingName ?? unit.building ?? "Корпус 1";
      const buildingId = unit.buildingId ?? unit.building ?? buildingName;

      if (!buildingsMap.has(buildingName)) {
        buildingsMap.set(buildingName, {
          id: buildingId,
          name: buildingName,
          floorsTotal: unit.floorsTotal ?? 25,
          units: [],
        });
      }

      buildingsMap.get(buildingName)!.units.push({
        id: unit.id,
        number: unit.number ?? "0",
        rooms: unit.rooms ?? 0,
        floor: unit.floor ?? 1,
        price: unit.price ?? 0,
        area: unit.area ?? 0,
        pricePerM2: unit.pricePerM2 ?? 0,
        view: unit.view ?? "город",
        section: unit.section ?? "A",
        status: unit.status ?? "available",
        statusHumanized: unit.statusHumanized ?? "Свободно",
        hasSpecialOffer: unit.hasSpecialOffer ?? false,
        layoutImage: unit.layoutImage ?? undefined,
      });
    }

    const buildings = Array.from(buildingsMap.values());
    // #region agent log
    _log("before return", {
      buildingsLength: buildings.length,
      totalUnits: buildings.reduce((s, b) => s + b.units.length, 0),
      buildingNames: buildings.map((b) => b.name),
    });
    // #endregion
    if (!buildings.length) return null;

    return {
      id: "tempo-nova",
      name: "ТЕМПО",
      buildings,
    };
  } catch (error) {
    // #region agent log
    _log("getTempoData error", { error: String(error) });
    // #endregion
    console.error("Error fetching Tempo data:", error);
    return null;
  }
});

export const getBuildingByIndex = cache(
  async (index: number): Promise<TempoBuilding | null> => {
    const data = await getTempoData();
    if (!data || !data.buildings[index]) return null;
    return data.buildings[index];
  }
);
