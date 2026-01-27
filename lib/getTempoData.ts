import { cache } from "react";
import { getCachedBuildings } from "./profitbaseFeed";

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
    const buildings = await getCachedBuildings();
    
    if (!buildings || buildings.length === 0) {
      return null;
    }

    return {
      id: "tempo-nova",
      name: "ТЕМПО",
      buildings: buildings.map((b) => ({
        id: b.id,
        name: b.name,
        floorsTotal: b.floorsTotal,
        units: b.units.map((u) => ({
          id: u.id,
          number: u.number,
          rooms: u.rooms,
          floor: u.floor,
          price: u.price,
          area: u.area,
          pricePerM2: u.pricePerM2,
          view: u.view,
          section: u.section,
          status: u.status,
          statusHumanized: u.statusHumanized,
          hasSpecialOffer: u.hasSpecialOffer,
          specialOfferName: u.specialOfferName,
          layoutImage: u.layoutImage,
        })),
      })),
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
