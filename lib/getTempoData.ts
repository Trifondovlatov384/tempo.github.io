import { cache } from "react";
import { getCachedBuildings } from "./mockData";
import { getCachedFeedData } from "./feedCache";

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
    // Try to get cached feed data first
    const cachedFeed = getCachedFeedData();
    if (cachedFeed && cachedFeed.units.length > 0) {
      console.log(`Using cached feed data: ${cachedFeed.units.length} units from ${cachedFeed.buildings.length} buildings`);
      
      // Group units by building
      const buildingsMap = new Map<string, TempoBuilding>();
      
      cachedFeed.units.forEach((unit) => {
        const buildingName = unit.building;
        if (!buildingsMap.has(buildingName)) {
          const buildingInfo = cachedFeed.buildings.find(b => b.name === buildingName);
          buildingsMap.set(buildingName, {
            id: buildingName,
            name: buildingName,
            floorsTotal: buildingInfo?.floorsTotal || 25,
            units: [],
          });
        }
        
        buildingsMap.get(buildingName)!.units.push({
          id: unit.id,
          number: unit.number,
          rooms: unit.rooms,
          floor: unit.floor,
          price: unit.price,
          area: unit.area,
          pricePerM2: unit.pricePerM2,
          view: unit.view,
          section: unit.section,
          status: unit.status,
          statusHumanized: unit.statusHumanized,
          hasSpecialOffer: unit.hasSpecialOffer,
          layoutImage: unit.layoutImage,
        });
      });
      
      const buildings = Array.from(buildingsMap.values());
      
      if (buildings.length > 0) {
        return {
          id: "tempo-nova",
          name: "ТЕМПО",
          buildings,
        };
      }
    }
    
    // Fallback to mock data if no cached feed
    console.log("No cached feed data, using mock data");
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
