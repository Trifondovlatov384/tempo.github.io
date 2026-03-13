import { parseStringPromise } from "xml2js";

export interface ProfitbaseOffer {
  number: string;
  floor: number;
  houseName: string;
  houseFloorsTotal?: number;
  type?: string;
  rooms?: number;
  price: number;
  area: number;
  pricePerM2: number;
  view?: string;
  status?: string;
  statusHumanized?: string;
  image?: string;
  readyQuarter?: string;
  builtYear?: string;
}

export interface ParsedFeedData {
  buildings: Map<
    string,
    { name: string; floorsTotal: number; handOverDate?: string }
  >;
  units: Array<{
    id: string;
    number: string;
    floor: number;
    rooms: number;
    price: number;
    area: number;
    pricePerM2: number;
    view: string;
    section: string;
    status: string;
    statusHumanized: string;
    hasSpecialOffer: boolean;
    layoutImage?: string;
    building: string;
  }>;
}

export async function parseProfitbaseXml(
  xmlContent: string
): Promise<ProfitbaseOffer[]> {
  const parsed = await parseStringPromise(xmlContent);
  if (parsed["realty-feed"]) {
    return parseProfitbaseFormat(parsed["realty-feed"]);
  }
  if (parsed.complexes) {
    return parseDomclickFormat(parsed.complexes);
  }
  throw new Error(
    "Unknown XML format. Expected realty-feed or complexes root element."
  );
}

function parseProfitbaseFormat(realtyFeed: any): ProfitbaseOffer[] {
  const offers = realtyFeed.offer || [];
  const result: ProfitbaseOffer[] = [];
  offers.forEach((offer: any) => {
    try {
      const house = offer.house?.[0] || {};
      const houseId = house.id?.[0] || "unknown";
      const houseName = house.name?.[0] || `Building ${houseId}`;
      const houseFloorsTotal = parseInt(
        house["floors-total"]?.[0] || "0",
        10
      );
      const number = offer.number?.[0] || "";
      const floor = parseInt(offer.floor?.[0] || "0", 10);
      const price = parseFloat(offer.price?.[0]?.value?.[0] || "0");
      const area = parseFloat(offer.area?.[0]?.value?.[0] || "0");
      const pricePerM2 = parseFloat(
        offer["price-meter"]?.[0]?.value?.[0] || "0"
      );
      const rooms = parseInt(offer.rooms?.[0] || "0", 10);
      const view = offer["window-view"]?.[0] || "";
      const statusHumanized = offer["status-humanized"]?.[0] || "Свободно";
      const status = mapStatusHumanized(statusHumanized);
      let image: string | undefined;
      const images = offer.image || [];
      for (const img of images) {
        const type = img?.$?.["type"] ?? "";
        if (String(type).toLowerCase().includes("plan")) {
          image = img._ ?? img;
          if (typeof image !== "string") image = undefined;
          break;
        }
      }
      result.push({
        number,
        floor,
        houseName,
        houseFloorsTotal,
        type: `${rooms}-к.кв`,
        rooms,
        price,
        area,
        pricePerM2,
        view,
        status,
        statusHumanized,
        image,
        readyQuarter: house["ready-quarter"]?.[0],
        builtYear: house["built-year"]?.[0],
      });
    } catch (e) {
      console.error("Error parsing offer:", e);
    }
  });
  return result;
}

function parseDomclickFormat(complexes: any): ProfitbaseOffer[] {
  const result: ProfitbaseOffer[] = [];
  const complexList = complexes.complex || [];
  complexList.forEach((complex: any) => {
    const buildings = complex.buildings?.[0]?.building || [];
    buildings.forEach((building: any) => {
      const buildingId = building.id?.[0] || "unknown";
      const buildingName = building.name?.[0] || `Building ${buildingId}`;
      const floorsTotal = parseInt(building.floors?.[0] || "0", 10);
      const flats = building.flats?.[0]?.flat || [];
      flats.forEach((flat: any) => {
        try {
          const apartment = flat.apartment?.[0] || "";
          const floor = parseInt(flat.floor?.[0] || "0", 10);
          const price = parseFloat(flat.price?.[0] || "0");
          const area = parseFloat(flat.area?.[0] || "0");
          const pricePerM2 = area > 0 ? price / area : 0;
          const rooms = parseInt(flat.room?.[0] || "0", 10);
          const view = flat.window_view?.[0] || "";
          let image: string | undefined;
          const plans = flat.plans?.[0]?.plan || [];
          if (plans.length > 0) image = plans[0];
          result.push({
            number: apartment,
            floor,
            houseName: buildingName,
            houseFloorsTotal: floorsTotal,
            type: `${rooms}-к.кв`,
            rooms,
            price,
            area,
            pricePerM2,
            view,
            status: "available",
            statusHumanized: "Свободно",
            image,
            readyQuarter: building.ready_quarter?.[0],
            builtYear: building.built_year?.[0],
          });
        } catch (e) {
          console.error("Error parsing flat:", e);
        }
      });
    });
  });
  return result;
}

function mapStatusHumanized(statusHumanized: string): string {
  const s = statusHumanized?.toLowerCase() || "";
  if (s.includes("свобод")) return "available";
  if (s.includes("продан")) return "sold";
  if (s.includes("не для продаж")) return "closed_for_sale";
  if (s.includes("платная")) return "paid_reservation";
  if (s.includes("устная")) return "free_reservation";
  if (s.includes("дду") || s.includes("оформлени")) return "paid_reservation";
  if (s.includes("подписан")) return "paid_reservation";
  return "available";
}

export function convertOffersToParsedFeed(
  offers: ProfitbaseOffer[]
): ParsedFeedData {
  const buildingsMap = new Map<
    string,
    { name: string; floorsTotal: number; handOverDate?: string }
  >();
  const unitsMap = new Map<string, ProfitbaseOffer>();
  offers.forEach((offer) => {
    const key = `${offer.houseName}:${offer.number}`;
    unitsMap.set(key, offer);
    if (!buildingsMap.has(offer.houseName)) {
      buildingsMap.set(offer.houseName, {
        name: offer.houseName,
        floorsTotal: offer.houseFloorsTotal || 25,
        handOverDate: offer.readyQuarter
          ? `Q${offer.readyQuarter} ${offer.builtYear}`
          : undefined,
      });
    }
  });
  const units = Array.from(unitsMap.values()).map((offer) => ({
    id: `${offer.houseName}:${offer.number}`.replace(/\s+/g, "_"),
    number: offer.number,
    floor: offer.floor,
    rooms: offer.rooms || 0,
    price: offer.price,
    area: offer.area,
    pricePerM2: offer.pricePerM2,
    view: offer.view || "город",
    section: offer.houseName.charAt(0).toUpperCase(),
    status: offer.status || "available",
    statusHumanized: offer.statusHumanized || "Свободно",
    hasSpecialOffer: false,
    layoutImage: offer.image,
    building: offer.houseName,
  }));
  return { buildings: buildingsMap, units };
}
