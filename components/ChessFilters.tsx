"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { INSTALLMENT_OPTIONS } from "@/lib/discountConfig";
import type { TempoBuilding, TempoUnit } from "@/lib/getTempoData";

type RoomType = "ст" | "1" | "2" | "3" | "4+";

const ROOM_OPTIONS: RoomType[] = ["ст", "1", "2", "3", "4+"];

export type ChessFiltersState = {
  rooms: RoomType[];
  priceFrom: number | null;
  priceTo: number | null;
  areaFrom: number | null;
  areaTo: number | null;
  windowView: string[];
  installmentId: string;
};

type Props = {
  buildings: TempoBuilding[];
  currentBuildingIndex: number;
  filters: ChessFiltersState;
  onFiltersChange: (filters: ChessFiltersState) => void;
};

export function ChessFilters({
  buildings,
  currentBuildingIndex,
  filters,
  onFiltersChange,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);

  const currentBuilding = buildings[currentBuildingIndex];

  const handleBuildingChange = (index: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("building", String(index + 1));
    router.push(`/tempo_nova/chess?${params.toString()}`);
    setBuildingDropdownOpen(false);
  };

  const toggleRoom = (room: RoomType) => {
    const newRooms = filters.rooms.includes(room)
      ? filters.rooms.filter((r) => r !== room)
      : [...filters.rooms, room];
    onFiltersChange({ ...filters, rooms: newRooms });
  };

  const handleReset = () => {
    onFiltersChange({
      rooms: [],
      priceFrom: null,
      priceTo: null,
      areaFrom: null,
      areaTo: null,
      windowView: [],
      installmentId: "full",
    });
  };

  const hasActiveFilters =
    filters.rooms.length > 0 ||
    filters.priceFrom !== null ||
    filters.priceTo !== null ||
    filters.areaFrom !== null ||
    filters.areaTo !== null ||
    filters.windowView.length > 0;

  return (
    <div className="bg-gradient-to-br from-white/80 via-white/70 to-white/60 backdrop-blur-xl border-b border-white/20 rounded-b-xl">
      {/* Top bar with building selector */}
      <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between">
        {/* Building dropdown */}
        <div className="relative">
          <button
            onClick={() => setBuildingDropdownOpen(!buildingDropdownOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-[#2a515f] hover:text-[#b69a76] transition-colors"
          >
            <span>Шахматки – {currentBuilding?.name || `Корпус ${currentBuildingIndex + 1}`}</span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${buildingDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {buildingDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-gradient-to-br from-white/90 via-white/80 to-white/70 backdrop-blur-xl rounded-lg shadow-lg border border-white/30 py-1 z-50 min-w-[150px]">
              {buildings.map((building, idx) => (
                <button
                  key={building.id}
                  onClick={() => handleBuildingChange(idx)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/30 transition-colors text-[#2a515f] ${
                    idx === currentBuildingIndex ? "bg-white/40 font-medium" : ""
                  }`}
                >
                  {building.name || `Корпус ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-6">
        {/* Rooms filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#2a515f]">Комнаты</span>
          <div className="flex gap-2">
            {ROOM_OPTIONS.map((room) => (
              <button
                key={room}
                onClick={() => toggleRoom(room)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all font-medium ${
                  filters.rooms.includes(room)
                    ? "bg-[#b69a76] text-white shadow-md"
                    : "bg-white/40 text-[#2a515f] hover:bg-white/60"
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>

        {/* Price filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#2a515f]">Цена, млн</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="от"
              value={filters.priceFrom ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceFrom: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-20 px-3 py-1.5 text-sm bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:border-[#b69a76] focus:bg-white/60 text-[#2a515f] placeholder-[#2a515f]/40 transition-all"
            />
            <span className="text-[#2a515f]/50">-</span>
            <input
              type="number"
              placeholder="до"
              value={filters.priceTo ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceTo: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-20 px-3 py-1.5 text-sm bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:border-[#b69a76] focus:bg-white/60 text-[#2a515f] placeholder-[#2a515f]/40 transition-all"
            />
          </div>
        </div>

        {/* Area filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#2a515f]">Площадь м²</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="от"
              value={filters.areaFrom ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  areaFrom: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-16 px-3 py-1.5 text-sm bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:border-[#b69a76] focus:bg-white/60 text-[#2a515f] placeholder-[#2a515f]/40 transition-all"
            />
            <span className="text-[#2a515f]/50">-</span>
            <input
              type="number"
              placeholder="до"
              value={filters.areaTo ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  areaTo: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-16 px-3 py-1.5 text-sm bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:border-[#b69a76] focus:bg-white/60 text-[#2a515f] placeholder-[#2a515f]/40 transition-all"
            />
          </div>
        </div>

        {/* Window view filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#2a515f]">Вид</span>
          <select
            multiple
            value={filters.windowView}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              onFiltersChange({ ...filters, windowView: selected });
            }}
            className="px-3 py-1.5 text-sm bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:border-[#b69a76] focus:bg-white/60 text-[#2a515f] transition-all"
          >
            <option value="Вид во двор">Вид во двор</option>
            <option value="Вид на море">Вид на море</option>
            <option value="Вид на улицу">Вид на улицу</option>
          </select>
        </div>

        {/* Installment selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#2a515f]">Условия</span>
          <select
            value={filters.installmentId}
            onChange={(e) => onFiltersChange({ ...filters, installmentId: e.target.value })}
            className="px-3 py-1.5 text-sm bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:border-[#b69a76] focus:bg-white/60 text-[#2a515f] transition-all"
          >
            {INSTALLMENT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
                {opt.discountPercent > 0 && ` (-${opt.discountPercent}%)`}
              </option>
            ))}
          </select>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            Сброс
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-6 border-t border-white/20 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-white border-2 border-[#b69a76]" />
          <span className="text-[#2a515f]/70">Свободно</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-[#f4d181]" />
          <span className="text-[#2a515f]/70">Платная бронь</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-[#a0a0a0]" />
          <span className="text-[#2a515f]/70">Продано / ДДУ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-[#d0d0d0]" />
          <span className="text-[#2a515f]/70">Не для продажи</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white border-2 border-red-400 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          </div>
          <span className="text-[#2a515f]/70">Спец. предложение</span>
        </div>
      </div>
    </div>
  );
}

// Helper to filter units based on filter state
export function filterUnits(
  units: TempoUnit[],
  filters: ChessFiltersState
): TempoUnit[] {
  return units.filter((unit) => {
    // Room filter
    if (filters.rooms.length > 0) {
      const unitRooms = getRoomType(unit.rooms);
      if (!unitRooms || !filters.rooms.includes(unitRooms)) {
        return false;
      }
    }

    // Price filter (in millions)
    if (filters.priceFrom !== null && unit.price !== null) {
      if (unit.price < filters.priceFrom * 1000000) return false;
    }
    if (filters.priceTo !== null && unit.price !== null) {
      if (unit.price > filters.priceTo * 1000000) return false;
    }

    // Area filter
    if (filters.areaFrom !== null && unit.area !== null) {
      if (unit.area < filters.areaFrom) return false;
    }
    if (filters.areaTo !== null && unit.area !== null) {
      if (unit.area > filters.areaTo) return false;
    }

    // Window view filter
    if (filters.windowView.length > 0) {
      if (!unit.view || !filters.windowView.includes(unit.view)) {
        return false;
      }
    }

    return true;
  });
}

function getRoomType(rooms: number): RoomType | null {
  if (rooms === 0) return "ст";
  if (rooms >= 4) return "4+";
  return (rooms.toString() as RoomType) || null;
}
