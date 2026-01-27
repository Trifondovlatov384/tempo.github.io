"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChessFilters, filterUnits, type ChessFiltersState } from "@/components/ChessFilters";
import { ChessBoard } from "@/components/ChessBoard";
import { UnitDetailPanel } from "@/components/UnitDetailPanel";
import type { TempoComplex, TempoUnit } from "@/lib/getTempoData";
import { INSTALLMENT_OPTIONS } from "@/lib/discountConfig";

type Props = {
  data: TempoComplex;
};

export function ChessPageContent({ data }: Props) {
  const searchParams = useSearchParams();
  const initialBuildingIndex = Math.max(0, (parseInt(searchParams.get("building") || "1") - 1));
  
  const buildingIndex = initialBuildingIndex < data.buildings.length ? initialBuildingIndex : 0;
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

  const currentBuilding = data.buildings[buildingIndex];

  const filteredUnits = useMemo(() => {
    if (!currentBuilding) return [];
    return filterUnits(currentBuilding.units, filters);
  }, [currentBuilding, filters]);

  const installmentOption = INSTALLMENT_OPTIONS.find(
    (opt) => opt.id === filters.installmentId
  );
  const discountPercent = installmentOption?.discountPercent || 0;

  return (
    <>
      <div className="w-full">
        <ChessFilters
          buildings={data.buildings}
          currentBuildingIndex={buildingIndex}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <div className="overflow-y-auto">
          <ChessBoard
            units={filteredUnits}
            discountPercent={discountPercent}
            onUnitClick={setSelectedUnit}
          />
        </div>
      </div>

      {selectedUnit && (
        <UnitDetailPanel
          unit={selectedUnit}
          discountPercent={discountPercent}
          complexName={currentBuilding?.name || null}
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </>
  );
}
