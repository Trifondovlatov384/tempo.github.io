import { connectToDatabase } from "@/lib/mongodb";
import { parseProfitbaseXml, convertOffersToParsedFeed } from "@/lib/profitbaseFeedParser";
import { getCachedFeedData, setCachedFeedData } from "@/lib/feedCache";
import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    // First try to return cached feed data
    const cachedData = getCachedFeedData();
    if (cachedData) {
      return Response.json(cachedData.units);
    }

    const { db } = await connectToDatabase();

    // Get all units sorted by floor (descending) then by number
    const units = await db
      .collection("units")
      .find({})
      .sort({ floor: -1, number: 1 })
      .toArray();

    // Transform units to include building info
    const unitsWithBuilding = units.map((unit: any) => ({
      _id: unit._id,
      id: unit._id?.toString() || `unit-${unit.number}`,
      number: unit.number,
      rooms: unit.rooms || 0,
      floor: unit.floor,
      price: unit.price,
      area: unit.area,
      pricePerM2: unit.pricePerM2,
      view: unit.view || "город",
      section: unit.section || "A",
      status: unit.status,
      status_humanized: unit.status_humanized || "Свободно",
      hasSpecialOffer: unit.hasSpecialOffer || false,
      specialOfferName: unit.specialOfferName,
      layoutImage: unit.layoutImage,
      building_id: unit.building_id || "building-1",
      building_name: unit.building_name || "Корпус 1",
      floors_total: unit.floors_total || 25,
    }));

    return Response.json(unitsWithBuilding);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST to sync feed (parse only, no DB writes - returns parsed data)
export async function POST(request: NextRequest) {
  try {
    const { feedUrl } = await request.json();

    if (!feedUrl) {
      return Response.json(
        { success: false, error: "feedUrl is required" },
        { status: 400 }
      );
    }

    // Fetch feed XML
    console.log(`Fetching feed from: ${feedUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const feedResponse = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!feedResponse.ok) {
      return Response.json(
        { success: false, error: `Failed to fetch feed: ${feedResponse.statusText}` },
        { status: 400 }
      );
    }

    const xmlContent = await feedResponse.text();
    console.log(`Feed size: ${(xmlContent.length / 1024 / 1024).toFixed(2)} MB`);

    // Parse feed
    console.log("Parsing feed XML...");
    const offers = await parseProfitbaseXml(xmlContent);
    console.log(`Parsed ${offers.length} offers from feed`);

    // Convert to feed data with deduplication
    const feedData = convertOffersToParsedFeed(offers);
    console.log(`After dedup: ${feedData.units.length} units in ${feedData.buildings.size} buildings`);

    // Transform buildings to array format
    const buildings = Array.from(feedData.buildings.entries()).map(([name, building]) => ({
      id: name,
      name: building.name,
      floorsTotal: building.floorsTotal,
      handOverDate: building.handOverDate,
      unitCount: feedData.units.filter(u => u.building === name).length,
    }));

    // Cache the parsed data
    setCachedFeedData({
      buildings,
      units: feedData.units,
      timestamp: Date.now(),
      feedUrl,
    });

    return Response.json({
      success: true,
      message: "Feed parsed successfully and cached",
      summary: {
        feedUrl,
        totalBuildings: buildings.length,
        totalUnits: feedData.units.length,
        buildings: buildings.map(b => `${b.name} (${b.unitCount} units)`),
      },
      data: {
        buildings,
        units: feedData.units.length, // Just return count, not full array
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
