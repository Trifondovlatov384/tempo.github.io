/**
 * Manual feed sync endpoint for testing
 * GET /api/sync-feed?feedUrl=https://...
 */

import { connectToDatabase } from "@/lib/mongodb";
import { parseProfitbaseXml } from "@/lib/profitbaseFeedParser";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const feedUrl = request.nextUrl.searchParams.get("feedUrl");

    if (!feedUrl) {
      return Response.json(
        { success: false, error: "feedUrl query parameter is required" },
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
    console.error("Sync feed error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
