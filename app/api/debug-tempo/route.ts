/**
 * Временный отладочный endpoint: что видит Prisma при запросе юнитов.
 * Открой в браузере /api/debug-tempo и пришли вывод для анализа.
 * Удалить после исправления бага.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbUnits = await prisma.unit.findMany({
      orderBy: [{ floor: "desc" }, { number: "asc" }],
      take: 3,
    });
    const total = await prisma.unit.count();
    const first = dbUnits[0];
    const firstKeys = first ? Object.keys(first) : [];
    const firstBuilding = first ? (first as { building?: string }).building : undefined;
    const firstBuildingName = first ? (first as { buildingName?: string }).buildingName : undefined;

    const buildingsMap = new Map<string, { name: string; count: number }>();
    const allUnits = await prisma.unit.findMany({ orderBy: [{ floor: "desc" }] });
    for (const u of allUnits) {
      const name = (u.buildingName ?? u.building ?? "Корпус 1") as string;
      if (!buildingsMap.has(name)) buildingsMap.set(name, { name, count: 0 });
      buildingsMap.get(name)!.count += 1;
    }
    const buildings = Array.from(buildingsMap.values());

    return NextResponse.json({
      hypothesis: "A_B_E",
      prisma: {
        totalUnits: total,
        sampleSize: dbUnits.length,
        firstUnitKeys: firstKeys,
        firstUnitBuilding: firstBuilding,
        firstUnitBuildingName: firstBuildingName,
      },
      afterGrouping: {
        buildingsLength: buildings.length,
        buildingNames: buildings.map((b) => b.name),
        unitsPerBuilding: buildings.map((b) => ({ name: b.name, count: b.count })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e), hypothesis: "A_B_E" },
      { status: 500 }
    );
  }
}
