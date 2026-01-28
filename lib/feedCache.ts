/**
 * In-memory cache for parsed feed data
 * Server-side cache that persists parsed feed across requests
 */

export interface CachedFeedData {
  buildings: Array<{
    id: string;
    name: string;
    floorsTotal: number;
    handOverDate?: string;
    unitCount: number;
  }>;
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
  timestamp: number;
  feedUrl?: string;
}

let cachedFeedData: CachedFeedData | null = null;

export function setCachedFeedData(data: CachedFeedData): void {
  cachedFeedData = data;
  console.log(`Feed cache updated: ${data.units.length} units from ${data.buildings.length} buildings`);
}

export function getCachedFeedData(): CachedFeedData | null {
  if (!cachedFeedData) {
    return null;
  }

  // Check if cache is older than 1 hour
  if (Date.now() - cachedFeedData.timestamp > 3600000) {
    console.log("Feed cache expired");
    cachedFeedData = null;
    return null;
  }

  return cachedFeedData;
}

export function clearCachedFeedData(): void {
  cachedFeedData = null;
  console.log("Feed cache cleared");
}

export function hasCachedFeedData(): boolean {
  return getCachedFeedData() !== null;
}
