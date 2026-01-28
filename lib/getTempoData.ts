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

export const getTempoData = cache(async (): Promise<TempoComplex | null> => {
  try {
    // Try to fetch from MongoDB via API first
    try {
      const response = await fetch("http://localhost:3000/api/units", {
        next: { revalidate: 60 } // Revalidate every 60 seconds
      });
      
      if (response.ok) {
        const apiUnits = await response.json();
        
        if (apiUnits && apiUnits.length > 0) {
          // Group units by building
          const buildingsMap = new Map<string, any>();
          
          apiUnits.forEach((unit: any) => {
            const buildingId = unit.building_id || "building-1";
            if (!buildingsMap.has(buildingId)) {
              buildingsMap.set(buildingId, {
                id: buildingId,
                name: unit.building_name || "Корпус 1",
                floorsTotal: unit.floors_total || 25,
                units: [],
              });
            }
            
            buildingsMap.get(buildingId).units.push({
              id: unit._id?.toString() || `unit-${unit.number}`,
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
              specialOfferName: unit.specialOfferName,
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
      }
    } catch (apiError) {
      console.log("MongoDB API not available, falling back to mock data");
    }
    
    // Fallback to mock data
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
