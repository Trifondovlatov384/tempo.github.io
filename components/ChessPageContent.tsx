"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChessFilters,
  filterUnits,
  type ChessFiltersState,
} from "@/components/ChessFilters";
import { ChessBoard } from "@/components/ChessBoard";
import { UnitDetailPanel } from "@/components/UnitDetailPanel";
import { SyncFeedButton } from "@/components/SyncFeedButton";
import type { TempoComplex, TempoUnit, TempoBuilding } from "@/lib/getTempoData";
import { INSTALLMENT_OPTIONS } from "@/lib/discountConfig";

type Props = {
  data: TempoComplex;
};

export function ChessPageContent({ data }: Props) {
  const searchParams = useSearchParams();

  const [selectedUnit, setSelectedUnit] = useState<TempoUnit | null>(null);
  const [filters, setFilters] = useState<ChessFiltersState>({
    rooms: [],
    priceFrom: null,
    priceTo: null,
    areaFrom: null,
    areaTo: null,
    windowView: [],
    installmentId: "full",
  });

  const installmentOption = INSTALLMENT_OPTIONS.find(
    (opt) => opt.id === filters.installmentId
  );
  const discountPercent = installmentOption?.discountPercent || 0;

  const currentBuildingIndex = useMemo(() => {
    const buildingParam = searchParams.get("building");
    if (!buildingParam) return 0;
    const index = Number(buildingParam) - 1;
    if (Number.isNaN(index) || index < 0) return 0;
    if (index >= data.buildings.length) return 0;
    return index;
  }, [searchParams, data.buildings.length]);

  const buildingsWithUnits = useMemo(
    () =>
      data.buildings.map((building: TempoBuilding) => ({
        building,
        units: filterUnits(building.units, filters),
      })),
    [data.buildings, filters]
  );

  const selectedBuildingEntry =
    buildingsWithUnits[currentBuildingIndex] ?? buildingsWithUnits[0];

  type StatusStats = { total: number; available: number; sold: number; paidReservation: number; freeReservation: number };
  const statusStats = useMemo((): StatusStats => {
    const units = selectedBuildingEntry?.units ?? [];
    return units.reduce<StatusStats>(
      (acc, unit: TempoUnit) => {
        const status = (unit.status || "").toLowerCase();
        if (status.includes("available")) acc.available += 1;
        if (status.includes("sold")) acc.sold += 1;
        if (status.includes("paid_reservation")) acc.paidReservation += 1;
        if (status.includes("free_reservation")) acc.freeReservation += 1;
        return acc;
      },
      {
        total: units.length,
        available: 0,
        sold: 0,
        paidReservation: 0,
        freeReservation: 0,
      }
    );
  }, [selectedBuildingEntry]);

  return (
    <>
      <div className="w-full">
        <ChessFilters
          buildings={data.buildings}
          currentBuildingIndex={currentBuildingIndex}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <div className="overflow-y-auto">
          {selectedBuildingEntry && (
            <div key={selectedBuildingEntry.building.id} className="mb-12">
              <div className="px-6 py-4 bg-gradient-to-r from-[#b69a76]/10 to-[#2a515f]/10 border-b border-[#b69a76]/20 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#2a515f]">
                    {selectedBuildingEntry.building.name}{" "}
                    {statusStats.total > 0 &&
                      `(${statusStats.total} апартаментов)`}
                  </h2>
                  {statusStats.total > 0 && (
                    <p className="mt-1 text-xs text-[#2a515f]/70">
                      Открыто в продажу: {statusStats.available} · Продано:{" "}
                      {statusStats.sold} · Забронировано:{" "}
                      {statusStats.paidReservation} · В резерве:{" "}
                      {statusStats.freeReservation}
                    </p>
                  )}
                </div>
                <SyncFeedButton />
              </div>
              <ChessBoard
                units={selectedBuildingEntry.units}
                discountPercent={discountPercent}
                onUnitClick={setSelectedUnit}
              />
            </div>
          )}
        </div>
      </div>

      {selectedUnit && (
        <UnitDetailPanel
          unit={selectedUnit}
          discountPercent={discountPercent}
          complexName={selectedUnit.section || data.buildings[0]?.name || null}
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </>
  );
}
