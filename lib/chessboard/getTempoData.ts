import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

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
  try {
    const dbUnits = await prisma.unit.findMany({
      orderBy: [{ floor: "desc" }, { number: "asc" }],
    });

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
    if (!buildings.length) return null;

    return {
      id: "tempo-nova",
      name: "ТЕМПО",
      buildings,
    };
  } catch (error) {
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
