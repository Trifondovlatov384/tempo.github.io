import { connectToDatabase } from "@/lib/mongodb";
import { parseProfitbaseXml } from "@/lib/profitbaseFeedParser";
import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  try {
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

// POST to sync feed
export async function POST(request: NextRequest) {
  try {
    const { feedUrl } = await request.json();

    if (!feedUrl) {
      return Response.json(
        { success: false, error: "feedUrl is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

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

    // Parse feed
    console.log("Parsing feed XML...");
    const offers = await parseProfitbaseXml(xmlContent);
    console.log(`Parsed ${offers.length} offers`);

    // Group by building
    const buildingMap = new Map<string, typeof offers>();
    offers.forEach((offer) => {
      if (!buildingMap.has(offer.houseName)) {
        buildingMap.set(offer.houseName, []);
      }
      buildingMap.get(offer.houseName)!.push(offer);
    });

    let buildingsCreated = 0;
    let buildingsUpdated = 0;
    let unitsCreated = 0;
    let unitsUpdated = 0;

    // Sync buildings and units
    for (const [buildingName, buildingOffers] of buildingMap.entries()) {
      const firstOffer = buildingOffers[0];

      // Upsert building
      const buildingResult = await db.collection("buildings").updateOne(
        { name: buildingName },
        {
          $set: {
            name: buildingName,
            floorsTotal: firstOffer.houseFloorsTotal || 25,
            handOverDate: firstOffer.readyQuarter
              ? `Q${firstOffer.readyQuarter} ${firstOffer.builtYear}`
              : undefined,
          },
          $setOnInsert: {
            name: buildingName,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      if (buildingResult.upsertedId) {
        buildingsCreated++;
      } else if (buildingResult.modifiedCount > 0) {
        buildingsUpdated++;
      }

      // Get building ID
      const building = await db.collection("buildings").findOne({ name: buildingName });
      const buildingId = building?._id;

      // Sync units
      for (const offer of buildingOffers) {
        const unitResult = await db.collection("units").updateOne(
          {
            building_id: buildingId?.toString() || buildingName,
            number: offer.number,
          },
          {
            $set: {
              number: offer.number,
              floor: offer.floor,
              building_id: buildingId?.toString() || buildingName,
              building_name: buildingName,
              floors_total: offer.houseFloorsTotal || 25,
              type: offer.type,
              rooms: offer.rooms,
              price: offer.price,
              area: offer.area,
              pricePerM2: offer.pricePerM2,
              view: offer.view,
              status: offer.status,
              status_humanized: offer.statusHumanized,
              layoutImage: offer.image,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        if (unitResult.upsertedId) {
          unitsCreated++;
        } else if (unitResult.modifiedCount > 0) {
          unitsUpdated++;
        }
      }
    }

    // Record sync event
    await db.collection("feed_syncs").insertOne({
      feedUrl,
      status: "success",
      buildingsCreated,
      buildingsUpdated,
      unitsCreated,
      unitsUpdated,
      timestamp: new Date(),
    });

    return Response.json({
      success: true,
      buildingsCreated,
      buildingsUpdated,
      unitsCreated,
      unitsUpdated,
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
