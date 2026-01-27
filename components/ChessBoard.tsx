"use client";

import { useMemo } from "react";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import type { TempoUnit } from "@/lib/getTempoData";

type Props = {
  units: TempoUnit[];
  discountPercent: number;
  onUnitClick: (unit: TempoUnit) => void;
};


export function ChessBoard({
  units,
  discountPercent,
  onUnitClick,
}: Props) {
  // Group units by section, then by floor
  const groupedBySectionAndFloor = useMemo(() => {
    const sections = new Map<string, Map<number, TempoUnit[]>>();

    for (const unit of units) {
      const section = unit.section || "Без секции";
      const floor = unit.floor || 0;

      if (!sections.has(section)) {
        sections.set(section, new Map());
      }
      const sectionMap = sections.get(section)!;
      if (!sectionMap.has(floor)) {
        sectionMap.set(floor, []);
      }
      sectionMap.get(floor)!.push(unit);
    }

    // Convert to sorted arrays
    const result = Array.from(sections.entries()).map(([section, floorsMap]) => {
      const floors = Array.from(floorsMap.entries())
        .sort((a, b) => b[0] - a[0]) // Sort floors descending
        .map(([floor, unitsInFloor]) => ({
          floor,
          units: unitsInFloor.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0)),
        }));

      return { section, floors };
    });

    return result;
  }, [units]);

  if (units.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-[#2a515f]/50">
        Нет квартир, соответствующих фильтрам
      </div>
    );
  }

  const getUnitStatusColor = (unit: TempoUnit): string => {
    const status = unit.status?.toUpperCase() || "";
    if (status.includes("AVAILABLE")) return "#ffffff";
    if (status.includes("SOLD") || status.includes("DDU")) return "#a0a0a0";
    if (status.includes("PAID_RESERVATION")) return "#f4d181";
    if (status.includes("CLOSED")) return "#d0d0d0";
    return "#ffffff";
  };

  const getUnitBorder = (unit: TempoUnit): string => {
    if (unit.hasSpecialOffer) {
      return "2px solid #ef4444";
    }
    return "2px solid #b69a76";
  };

  const formatPrice = (price: number | null, discount: number): string => {
    if (!price) return "—";
    const discountedPrice = Math.round(price * (1 - discount / 100));
    return `${(discountedPrice / 1000000).toFixed(2)}M`;
  };

  return (
    <div className="space-y-8 pb-8">
      {groupedBySectionAndFloor.map((sectionData) => (
        <div key={sectionData.section}>
          <h3 className="text-lg font-semibold text-[#2a515f] mb-4 px-6">
            {sectionData.section}
          </h3>

          {sectionData.floors.map((floorData) => (
            <div key={`${sectionData.section}-${floorData.floor}`} className="mb-6">
              <h4 className="text-sm font-medium text-[#2a515f]/60 mb-3 px-6">
                {floorData.floor} этаж
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-6">
                {floorData.units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => onUnitClick(unit)}
                    className="relative group focus:outline-none"
                  >
                    <div
                      style={{
                        backgroundColor: getUnitStatusColor(unit),
                        border: getUnitBorder(unit),
                      }}
                      className="aspect-square rounded-lg p-3 hover:shadow-lg transition-all hover:scale-105 flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Special offer badge */}
                      {unit.hasSpecialOffer && (
                        <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-red-600"></div>
                      )}

                      {/* Lock icon for closed apartments */}
                      {unit.status?.toUpperCase().includes("CLOSED") && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <LockClosedIcon className="w-6 h-6 text-[#2a515f]/40" />
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        {/* Apartment number */}
                        <div className="text-lg font-bold text-[#2a515f]">
                          {unit.number || "—"}
                        </div>

                        {/* Room count */}
                        <div className="text-xs text-[#2a515f]/60">
                          {unit.rooms === 0 ? "Студия" : `${unit.rooms}к`}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-xs">
                        {/* Area */}
                        {unit.area && (
                          <div className="text-[#2a515f]/70">{unit.area} м²</div>
                        )}

                        {/* Price */}
                        {unit.price && (
                          <div className="font-semibold text-[#b69a76]">
                            {formatPrice(unit.price, discountPercent)}
                          </div>
                        )}

                        {/* Original price if discount applied */}
                        {unit.price && discountPercent > 0 && (
                          <div className="text-[#2a515f]/40 line-through text-xs">
                            {formatPrice(unit.price, 0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
