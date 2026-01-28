"use client";

import { useState, useMemo } from "react";
import { ChessFilters, filterUnits, type ChessFiltersState } from "@/components/ChessFilters";
import { ChessBoard } from "@/components/ChessBoard";
import { UnitDetailPanel } from "@/components/UnitDetailPanel";
import type { TempoComplex, TempoUnit } from "@/lib/getTempoData";
import { INSTALLMENT_OPTIONS } from "@/lib/discountConfig";

type Props = {
  data: TempoComplex;
};

export function ChessPageContent({ data }: Props) {
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

  return (
    <>
      <div className="w-full">
        <ChessFilters
          buildings={data.buildings}
          currentBuildingIndex={0}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <div className="overflow-y-auto">
          {/* Show all buildings with their units */}
          {data.buildings.map((building) => {
            const filteredUnits = useMemo(() => {
              return filterUnits(building.units, filters);
            }, [building, filters]);

            return (
              <div key={building.id} className="mb-12">
                <div className="px-6 py-4 bg-gradient-to-r from-[#b69a76]/10 to-[#2a515f]/10 border-b border-[#b69a76]/20">
                  <h2 className="text-xl font-semibold text-[#2a515f]">
                    {building.name} ({filteredUnits.length} апартаментов)
                  </h2>
                </div>
                <ChessBoard
                  units={filteredUnits}
                  discountPercent={discountPercent}
                  onUnitClick={setSelectedUnit}
                />
              </div>
            );
          })}
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
