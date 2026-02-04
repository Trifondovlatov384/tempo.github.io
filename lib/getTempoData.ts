import { cache } from "react";
import { connectToDatabase } from "./mongodb";

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
    const { db } = await connectToDatabase();

    const dbUnits = await db
      .collection("units")
      .find({})
      .sort({ floor: -1, number: 1 })
      .toArray();

    if (!dbUnits || dbUnits.length === 0) {
      console.error("getTempoData: units collection is empty");
      return null;
    }

    const buildingsMap = new Map<string, TempoBuilding>();

    dbUnits.forEach((unit: any) => {
      const buildingName = unit.building_name || unit.building || "Корпус 1";
      const buildingId = unit.building_id?.toString?.() || buildingName;

      if (!buildingsMap.has(buildingName)) {
        buildingsMap.set(buildingName, {
          id: buildingId,
          name: buildingName,
          floorsTotal: unit.floors_total || 25,
          units: [],
        });
      }

      buildingsMap.get(buildingName)!.units.push({
        id: unit._id?.toString() || `${buildingId}-${unit.number}`,
        number: unit.number?.toString() || "0",
        rooms: unit.rooms || 0,
        floor: unit.floor || 1,
        price: unit.price || 0,
        area: unit.area || 0,
        pricePerM2: unit.pricePerM2 || 0,
        view: unit.view || "город",
        section: unit.section || "A",
        status: unit.status || "available",
        statusHumanized: unit.status_humanized || "Свободно",
        hasSpecialOffer: unit.hasSpecialOffer || false,
        layoutImage: unit.layoutImage,
      });
    });

    const buildings = Array.from(buildingsMap.values());

    if (buildings.length === 0) {
      console.error("getTempoData: no buildings constructed from units");
      return null;
    }

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
    if (!data || !data.buildings[index]) {
      return null;
    }
    return data.buildings[index];
  }
);
