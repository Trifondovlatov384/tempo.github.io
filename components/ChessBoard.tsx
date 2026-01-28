"use client";

import { useMemo } from "react";
import type { TempoUnit } from "@/lib/getTempoData";
import "../chess_primer.css";

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

  const getUnitStatusClass = (unit: TempoUnit): string => {
    const status = unit.status?.toLowerCase() || "";
    if (status.includes("available")) return "chess-cell--available";
    if (status.includes("sold")) return "chess-cell--sold";
    if (status.includes("paid_reservation")) return "chess-cell--paid-reservation";
    if (status.includes("free_reservation")) return "chess-cell--free-reservation";
    if (status.includes("closed")) return "chess-cell--closed";
    return "chess-cell--available";
  };

  const formatPrice = (price: number | null, discount: number): string => {
    if (!price) return "—";
    const discountedPrice = Math.round(price * (1 - discount / 100));
    return `${(discountedPrice / 1000000).toFixed(1)}M`;
  };

  // Render unified grid with chess_primer.css classes
  return (
    <div className="chessboard-wrapper">
      <div className="chessboard-scroll">
        <div className="chessboard-grid">
          {/* Header row with column numbers */}
          <div className="chessboard-header-row">
            <div className="chessboard-header-corner" />
            {Array.from({ length: gridData.maxCols }).map((_, colIdx) => (
              <div key={`col-${colIdx}`} className="chessboard-header-cell">
                {colIdx + 1}
              </div>
            ))}
          </div>

          {/* Floor rows */}
          {gridData.rows.map((row, rowIdx) => (
            <div
              key={`floor-${gridData.floors[rowIdx]}`}
              className="chessboard-floor-row"
            >
              {/* Floor label */}
              <div className="chessboard-floor-label">
                {gridData.floors[rowIdx]}
              </div>

              {/* Unit cells */}
              <div className="chessboard-floor-cells">
                {row.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => onUnitClick(unit)}
                    className="chess-cell-button"
                    title={`${unit.number} - ${formatPrice(unit.price, discountPercent)}`}
                  >
                    <div className={`chess-cell ${getUnitStatusClass(unit)}`}>
                      <div className="chess-cell-number">
                        {unit.number}
                      </div>
                      <div className="chess-cell-price">
                        {formatPrice(unit.price, discountPercent)}
                      </div>
                      {unit.hasSpecialOffer && (
                        <div className="chess-cell-lock">
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                {/* Fill empty cells for grid alignment */}
                {Array.from({
                  length: gridData.maxCols - row.length,
                }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="chess-cell--empty" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
