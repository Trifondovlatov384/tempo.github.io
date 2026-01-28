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
  // Group units by floor only
  const groupedByFloor = useMemo(() => {
    const floors = new Map<number, TempoUnit[]>();

    for (const unit of units) {
      const floor = unit.floor || 0;

      if (!floors.has(floor)) {
        floors.set(floor, []);
      }
      floors.get(floor)!.push(unit);
    }

    // Convert to sorted array: highest floor first
    const result = Array.from(floors.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, unitsInFloor]) => ({
        floor,
        units: unitsInFloor.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0)),
      }));

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
    <div className="space-y-2 pb-8 px-6">
      {groupedByFloor.map((floorData) => (
        <div key={`floor-${floorData.floor}`} className="flex gap-3">
          {/* Floor label on the left */}
          <div className="w-12 flex-shrink-0 flex items-center justify-end pr-2">
            <div className="text-sm font-semibold text-[#2a515f] text-right">
              {floorData.floor} этаж
            </div>
          </div>

          {/* Units grid for this floor */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {floorData.units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => onUnitClick(unit)}
                className="relative group focus:outline-none flex-shrink-0"
              >
                <div
                  style={{
                    backgroundColor: getUnitStatusColor(unit),
                    border: getUnitBorder(unit),
                  }}
                  className="w-16 h-16 rounded-lg p-2 hover:shadow-lg transition-all hover:scale-110 flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Special offer badge */}
                  {unit.hasSpecialOffer && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-red-600"></div>
                  )}

                  {/* Lock icon for closed apartments */}
                  {unit.status?.toUpperCase().includes("CLOSED") && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <LockClosedIcon className="w-4 h-4 text-[#2a515f]/40" />
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    {/* Apartment number */}
                    <div className="text-sm font-bold text-[#2a515f] leading-none">
                      {unit.number || "—"}
                    </div>

                    {/* Room count */}
                    <div className="text-xs text-[#2a515f]/60 leading-none">
                      {unit.rooms === 0 ? "Студия" : `${unit.rooms}к`}
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5 text-xs leading-none">
                    {/* Area */}
                    {unit.area && (
                      <div className="text-[#2a515f]/70 text-xs leading-none">{unit.area.toFixed(1)} м²</div>
                    )}

                    {/* Price */}
                    {unit.price && (
                      <div className="font-semibold text-[#b69a76] text-xs leading-none">
                        {formatPrice(unit.price, discountPercent)}
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
  );
}
