import { connectToDatabase } from "@/lib/mongodb";
import { parseProfitbaseXml, convertOffersToParsedFeed } from "@/lib/profitbaseFeedParser";
import { getCachedFeedData, setCachedFeedData } from "@/lib/feedCache";
import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    // First try to return cached feed data (fast path)
    const cachedData = getCachedFeedData();
    if (cachedData && cachedData.units.length > 0) {
      console.log(`Returning ${cachedData.units.length} units from cache`);
      return Response.json(cachedData.units);
    }

    try {
      const { db } = await connectToDatabase();

      // Get all units from MongoDB sorted by floor (descending) then by number
      const units = await db
        .collection("units")
        .find({})
        .sort({ floor: -1, number: 1 })
        .toArray();

      // Transform units to expected format
      const unitsFormatted = units.map((unit: any) => ({
        id: unit._id?.toString() || `unit-${unit.number}`,
        number: unit.number?.toString() || "0",
        floor: unit.floor || 1,
        rooms: unit.rooms || 0,
        price: unit.price || 0,
        area: unit.area || 0,
        pricePerM2: unit.pricePerM2 || 0,
        view: unit.view || "город",
        section: unit.section || "A",
        status: unit.status || "available",
        statusHumanized: unit.status_humanized || "Свободно",
        hasSpecialOffer: unit.hasSpecialOffer || false,
        layoutImage: unit.layoutImage,
        building: unit.building || unit.building_name || "Корпус 1",
        building_name: unit.building_name || unit.building || "Корпус 1",
        building_id: unit.building_id || unit.building || "building-1",
        floors_total: unit.floors_total || 25,
      }));

      console.log(`Returning ${unitsFormatted.length} units from MongoDB`);
      return Response.json(unitsFormatted);
    } catch (dbError) {
      console.warn("MongoDB not available:", dbError instanceof Error ? dbError.message : String(dbError));
      // Fall through to empty response - will use cached or mock data on client
      return Response.json([]);
    }
  } catch (error) {
    console.error("API Error:", error);
    return Response.json([], { status: 200 }); // Return empty array instead of error
  }
}

// POST to sync feed (parse and write to MongoDB)
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

    // Try to write to MongoDB (but don't fail if unavailable)
    try {
      const { db } = await connectToDatabase();
      console.log("Clearing old units from MongoDB...");
      await db.collection("units").deleteMany({});

      console.log(`Writing ${feedData.units.length} units to MongoDB...`);
      const unitsCollection = db.collection("units");
      
      // Batch insert in chunks of 1000
      const chunkSize = 1000;
      for (let i = 0; i < feedData.units.length; i += chunkSize) {
        const chunk = feedData.units.slice(i, i + chunkSize);
        const unitsToInsert = chunk.map(unit => ({
          number: unit.number,
          floor: unit.floor,
          building: unit.building,
          building_name: unit.building,
          building_id: unit.building,
          section: unit.section,
          rooms: unit.rooms,
          price: unit.price,
          area: unit.area,
          pricePerM2: unit.pricePerM2,
          view: unit.view,
          status: unit.status,
          status_humanized: unit.statusHumanized,
          layoutImage: unit.layoutImage,
          hasSpecialOffer: unit.hasSpecialOffer,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        await unitsCollection.insertMany(unitsToInsert);
        console.log(`Inserted units ${i}-${Math.min(i + chunkSize, feedData.units.length)}`);
      }

      console.log("All units written to MongoDB successfully");
    } catch (dbError) {
      console.warn("Could not write to MongoDB, will use in-memory cache:", dbError instanceof Error ? dbError.message : String(dbError));
    }

    // Save to in-memory cache for quick access
    setCachedFeedData({
      buildings: Array.from(feedData.buildings.entries()).map(([name, building]) => ({
        id: name,
        name: building.name,
        floorsTotal: building.floorsTotal,
        handOverDate: building.handOverDate,
        unitCount: feedData.units.filter(u => u.building === name).length,
      })),
      units: feedData.units,
      timestamp: Date.now(),
      feedUrl,
    });

    console.log("Feed data saved to in-memory cache");

    return Response.json({
      success: true,
      message: "Feed parsed and cached",
      summary: {
        feedUrl,
        totalBuildings: feedData.buildings.size,
        totalUnits: feedData.units.length,
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
