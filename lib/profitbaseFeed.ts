const FEED_URL = "https://pb20127.profitbase.ru/export/profitbase_xml/35f50fe5ae463dd58596adaae32464a5";

export type ProfitbaseUnit = {
  id: string;
  number: string;
  rooms: number;
  floor: number;
  area: number;
  pricePerM2: number;
  price: number;
  view: string;
  section: string;
  buildingName: string;
  status: string;
  statusHumanized: string;
  hasSpecialOffer: boolean;
  specialOfferName?: string;
  layoutImage?: string;
};

export type ProfitbaseBuilding = {
  id: string;
  name: string;
  floorsTotal: number;
  units: ProfitbaseUnit[];
};

/**
 * Загружает и парсит фид из Profitbase
 */
export async function fetchAndParseFeed(): Promise<ProfitbaseBuilding[]> {
  const response = await fetch(FEED_URL);
  const xmlText = await response.text();
  
  // Парсим вручную, парся XML-строки
  const offers = parseOffers(xmlText);
  
  // Дедупликация - берем по номеру лота и последней дате обновления
  const uniqueOffers = deduplicateOffers(offers);
  
  // Группируем по корпусам
  const buildingMap = new Map<string, ProfitbaseBuilding>();
  
  for (const offer of uniqueOffers) {
    if (!offer) continue;
    
    const buildingKey = offer.buildingName;
    if (!buildingMap.has(buildingKey)) {
      buildingMap.set(buildingKey, {
        id: offer.id.split('_')[0] || buildingKey,
        name: offer.buildingName,
        floorsTotal: 0,
        units: [],
      });
    }
    
    const building = buildingMap.get(buildingKey)!;
    building.units.push(offer);
    building.floorsTotal = Math.max(building.floorsTotal, offer.floor);
  }
  
  return Array.from(buildingMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name, 'ru')
  );
}

/**
 * Парсит XML и извлекает элементы <offer>
 */
function parseOffers(xmlText: string): ProfitbaseUnit[] {
  const offers: ProfitbaseUnit[] = [];
  const offerRegex = /<offer[^>]*>([\s\S]*?)<\/offer>/g;
  
  let match;
  while ((match = offerRegex.exec(xmlText)) !== null) {
    const offerContent = match[1];
    const unit = parseOffer(offerContent);
    if (unit) {
      offers.push(unit);
    }
  }
  
  return offers;
}

/**
 * Дедупликация предложений по номеру лота
 */
function deduplicateOffers(offers: ProfitbaseUnit[]): ProfitbaseUnit[] {
  const map = new Map<string, { offer: ProfitbaseUnit; date: Date }>();
  
  for (const offer of offers) {
    const number = offer.number;
    if (!number) continue;
    
    // Извлекаем дату из XML (если бы мы это сохраняли, но пока просто берем первое)
    const existing = map.get(number);
    if (!existing) {
      map.set(number, { offer, date: new Date() });
    }
  }
  
  return Array.from(map.values()).map(v => v.offer);
}

/**
 * Извлекает значение из XML
 */
function getXmlValue(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * Извлекает значение из вложенного XML
 */
function getXmlNestedValue(content: string, parentTag: string, childTag: string): string {
  const parentRegex = new RegExp(`<${parentTag}[^>]*>([\s\S]*?)<\/${parentTag}>`, "i");
  const parentMatch = content.match(parentRegex);
  if (!parentMatch) return "";
  
  const childRegex = new RegExp(`<${childTag}[^>]*>([^<]*)<\/${childTag}>`, "i");
  const childMatch = parentMatch[1].match(childRegex);
  return childMatch ? childMatch[1].trim() : "";
}

/**
 * Парсит одно предложение из содержимого <offer>
 */
function parseOffer(content: string): ProfitbaseUnit | null {
  try {
    const number = getXmlValue(content, "number");
    const rooms = parseInt(getXmlValue(content, "rooms") || "0");
    const floor = parseInt(getXmlValue(content, "floor") || "0");
    
    let area = parseFloat(getXmlNestedValue(content, "area", "value"));
    if (area === 0) {
      area = parseFloat(getXmlValue(content, "area"));
    }
    
    let price = parseInt(getXmlNestedValue(content, "price", "value"));
    if (price === 0) {
      const priceStr = getXmlValue(content, "price");
      price = parseInt(priceStr);
    }
    
    let pricePerM2 = parseInt(getXmlNestedValue(content, "price-meter", "value"));
    if (pricePerM2 === 0) {
      pricePerM2 = parseInt(getXmlValue(content, "price-meter"));
    }
    
    const view = getXmlValue(content, "window-view") || "Вид не указан";
    const section = getXmlValue(content, "building-section") || "";
    const buildingName = getXmlNestedValue(content, "house", "name") || "Unknown";
    const status = getXmlValue(content, "status") || "UNKNOWN";
    const statusHumanized = getXmlValue(content, "status-humanized") || status;
    
    // Парсим спецпредложения
    const specialOfferMatch = content.match(/<special-offer>([\s\S]*?)<\/special-offer>/i);
    const hasSpecialOffer = !!specialOfferMatch;
    const specialOfferName = hasSpecialOffer 
      ? getXmlValue(specialOfferMatch![1], "name")
      : undefined;
    
    // Парсим изображения
    const imageMatches = content.matchAll(/<image[^>]*type="([^"]*)"[^>]*>([^<]*)<\/image>/gi);
    let layoutImage: string | undefined;
    for (const imgMatch of imageMatches) {
      if (imgMatch[1] === "plan floor") {
        layoutImage = imgMatch[2].trim();
        break;
      }
    }
    
    if (!number || area === 0 || price === 0) {
      return null;
    }
    
    return {
      id: `${buildingName}_${number}`,
      number,
      rooms,
      floor,
      area,
      price,
      pricePerM2,
      view,
      section,
      buildingName,
      status,
      statusHumanized,
      hasSpecialOffer,
      specialOfferName,
      layoutImage,
    };
  } catch (error) {
    console.error('Error parsing offer:', error);
    return null;
  }
}

/**
 * Кеш для хранения загруженных данных
 */
let cachedBuildings: ProfitbaseBuilding[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 3600 * 1000; // 1 час

/**
 * Получает здания с кешированием
 */
export async function getCachedBuildings(): Promise<ProfitbaseBuilding[]> {
  const now = Date.now();
  
  if (cachedBuildings && now - cacheTime < CACHE_DURATION) {
    return cachedBuildings;
  }
  
  cachedBuildings = await fetchAndParseFeed();
  cacheTime = now;
  
  return cachedBuildings;
}
