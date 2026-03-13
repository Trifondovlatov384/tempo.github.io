import { prisma } from "@/lib/db/prisma";
import { runFeedSync } from "@/lib/profitbase/sync";
import type { NextRequest } from "next/server";

/**
 * GET /api/units — список юнитов из БД (Prisma).
 */
export async function GET(_request: NextRequest) {
  try {
    const units = await prisma.unit.findMany({
      orderBy: [{ floor: "desc" }, { number: "asc" }],
    });

    const formatted = units.map((unit) => ({
      id: unit.id,
      number: unit.number ?? "0",
      floor: unit.floor ?? 1,
      rooms: unit.rooms ?? 0,
      price: unit.price ?? 0,
      area: unit.area ?? 0,
      pricePerM2: unit.pricePerM2 ?? 0,
      view: unit.view ?? "город",
      section: unit.section ?? "A",
      status: unit.status ?? "available",
      statusHumanized: unit.statusHumanized ?? "Свободно",
      hasSpecialOffer: unit.hasSpecialOffer ?? false,
      layoutImage: unit.layoutImage ?? undefined,
      building: unit.buildingName ?? unit.building ?? "Корпус 1",
      building_name: unit.buildingName ?? unit.building ?? "Корпус 1",
      building_id: unit.buildingId ?? unit.building ?? "building-1",
      floors_total: unit.floorsTotal ?? 25,
    }));

    return Response.json(formatted);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/units — синхронизация фида (FEED_URL из .env или body.feedUrl).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const feedUrl =
      (body as { feedUrl?: string }).feedUrl ?? process.env.FEED_URL;

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
