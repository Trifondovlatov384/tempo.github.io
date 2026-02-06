import { connectToDatabase } from "@/lib/mongodb";
import { runFeedSync } from "@/lib/feedSync";
import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const { db } = await connectToDatabase();

    const units = await db
      .collection("units")
      .find({})
      .sort({ floor: -1, number: 1 })
      .toArray();

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

    return Response.json(unitsFormatted);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

// POST to sync feed (parse and write only to MongoDB, как в real-estate)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const feedUrl = body.feedUrl ?? process.env.FEED_URL;

    if (!feedUrl) {
      return Response.json(
        { success: false, error: "feedUrl required (body or FEED_URL)" },
        { status: 400 }
      );
    }

    const result = await runFeedSync(feedUrl);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Feed synced to database",
      summary: {
        totalBuildings: result.totalBuildings,
        totalUnits: result.totalUnits,
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
