import { cache } from "react";
import { getCachedBuildings } from "./mockData";

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

// In-memory cache for parsed feed data
let cachedParsedData: TempoComplex | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3600000; // 1 hour

export const getTempoData = cache(async (): Promise<TempoComplex | null> => {
  try {
    // Return cached data if still valid
    if (cachedParsedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
      console.log("Using cached feed data");
      return cachedParsedData;
    }

    // Skip API calls during build time
    if (process.env.NODE_ENV === "production" && !process.env.RUNTIME_ENV) {
      console.log("During build, using mock data");
      const buildings = await getCachedBuildings();
      if (buildings && buildings.length > 0) {
        cachedParsedData = {
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
        cacheTimestamp = Date.now();
      }
      return cachedParsedData;
    }

    // Try to fetch from API (which has parsed feed data)
    try {
      const response = await fetch("http://localhost:3000/api/units", {
        next: { revalidate: 60 }
      });
      
      if (response.ok) {
        const apiUnits = await response.json();
        
        if (Array.isArray(apiUnits) && apiUnits.length > 0) {
          // Group units by building
          const buildingsMap = new Map<string, any>();
          
          apiUnits.forEach((unit: any) => {
            const buildingName = unit.building || unit.building_name || "Корпус 1";
            if (!buildingsMap.has(buildingName)) {
              buildingsMap.set(buildingName, {
                id: buildingName,
                name: buildingName,
                floorsTotal: unit.floors_total || 25,
                units: [],
              });
            }
            
            buildingsMap.get(buildingName).units.push({
              id: unit.id || `unit-${unit.number}`,
              number: unit.number?.toString() || "0",
              rooms: unit.rooms || 0,
              floor: unit.floor || 1,
              price: unit.price || 0,
              area: unit.area || 0,
              pricePerM2: unit.pricePerM2 || 0,
              view: unit.view || "город",
              section: unit.section || "A",
              status: unit.status || "available",
              statusHumanized: unit.statusHumanized || unit.status_humanized || "Свободно",
              hasSpecialOffer: unit.hasSpecialOffer || false,
              specialOfferName: unit.specialOfferName,
              layoutImage: unit.layoutImage,
            });
          });
          
          const buildings = Array.from(buildingsMap.values());
          
          if (buildings.length > 0) {
            cachedParsedData = {
              id: "tempo-nova",
              name: "ТЕМПО",
              buildings,
            };
            cacheTimestamp = Date.now();
            console.log(`Loaded ${apiUnits.length} units from API`);
            return cachedParsedData;
          }
        }
      }
    } catch (apiError) {
      console.log("API not available, falling back to mock data");
    }
    
    // Fallback to mock data
    const buildings = await getCachedBuildings();
    
    if (!buildings || buildings.length === 0) {
      return null;
    }

    cachedParsedData = {
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
    cacheTimestamp = Date.now();
    
    return cachedParsedData;
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
