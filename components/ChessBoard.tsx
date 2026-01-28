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
  // Build unified chess grid
  const gridData = useMemo(() => {
    if (!units.length) return { floors: [], rows: [], maxCols: 0 };

    // Group by floor
    const byFloor = new Map<number, TempoUnit[]>();
    for (const unit of units) {
      const floor = unit.floor || 0;
      if (!byFloor.has(floor)) byFloor.set(floor, []);
      byFloor.get(floor)!.push(unit);
    }

    // Sort floors descending (highest first)
    const floors = Array.from(byFloor.keys()).sort((a, b) => b - a);

    // Sort units per floor by number
    const rows = floors.map((floor) => {
      const unitsOnFloor = byFloor.get(floor)!;
      return unitsOnFloor.sort((a, b) => {
        const numA = parseInt(a.number || "0");
        const numB = parseInt(b.number || "0");
        if (isNaN(numA) || isNaN(numB)) {
          return (a.number || "").localeCompare(b.number || "");
        }
        return numA - numB;
      });
    });

    // Find max columns
    const maxCols = Math.max(...rows.map((r) => r.length), 0);

    return { floors, rows, maxCols };
  }, [units]);

  if (units.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-[#2a515f]/50">
        Нет апартаментов, соответствующих фильтрам
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

  // Render unified table grid
  return (
    <div className="p-6 overflow-x-auto">
      <table className="border-collapse whitespace-nowrap">
        <tbody>
          {gridData.rows.map((row, rowIdx) => (
            <tr key={`floor-${gridData.floors[rowIdx]}`} className="h-20">
              {/* Floor label (left column) */}
              <td className="pr-4 pb-2 font-semibold text-[#2a515f] text-right w-12 align-top">
                {gridData.floors[rowIdx]}
              </td>

              {/* Unit cells */}
              {row.map((unit) => (
                <td
                  key={unit.id}
                  className="p-1"
                  style={{ width: "72px", height: "80px" }}
                >
                  <button
                    onClick={() => onUnitClick(unit)}
                    className="w-full h-full focus:outline-none"
                  >
                    <div
                      style={{
                        backgroundColor: getUnitStatusColor(unit),
                        border: getUnitBorder(unit),
                      }}
                      className="w-full h-full rounded p-1.5 hover:shadow-lg transition-all hover:scale-105 flex flex-col justify-between relative overflow-hidden text-xs"
                    >
                      {/* Special offer badge */}
                      {unit.hasSpecialOffer && (
                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-red-600"></div>
                      )}

                      {/* Lock icon */}
                      {unit.status?.toUpperCase().includes("CLOSED") && (
                        <LockClosedIcon className="w-3 h-3 text-[#2a515f]/40 mx-auto" />
                      )}

                      {/* Unit number */}
                      <div className="font-bold text-[#2a515f] leading-tight">
                        {unit.number}
                      </div>

                      {/* Room type */}
                      <div className="text-[#2a515f]/60 leading-tight">
                        {unit.rooms === 0 ? "Студия" : `${unit.rooms}к`}
                      </div>

                      {/* Area */}
                      {unit.area && (
                        <div className="text-[#2a515f]/70 leading-tight">
                          {unit.area.toFixed(1)} м²
                        </div>
                      )}

                      {/* Price */}
                      {unit.price && (
                        <div className="font-semibold text-[#b69a76] leading-tight">
                          {formatPrice(unit.price, discountPercent)}
                        </div>
                      )}
                    </div>
                  </button>
                </td>
              ))}

              {/* Empty cells for alignment */}
              {Array.from({
                length: gridData.maxCols - row.length,
              }).map((_, i) => (
                <td
                  key={`empty-${rowIdx}-${i}`}
                  className="p-1"
                  style={{ width: "72px", height: "80px" }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
