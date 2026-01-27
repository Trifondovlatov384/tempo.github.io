"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Squares2X2Icon,
  CalculatorIcon,
  WrenchScrewdriverIcon,
  ChevronDownIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

const BUILDINGS = [
  { id: "1", name: "Корпус 1" },
  { id: "2", name: "Корпус 2" },
  { id: "3", name: "Корпус 3" },
  { id: "4", name: "Корпус 4" },
];

export function LeftSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentBuilding = searchParams.get("building") || "1";
  const [chessExpanded, setChessExpanded] = useState(true);

  const isChessActive = pathname.includes("/tempo_nova/chess") || pathname === "/tempo_nova";
  const isInstallmentActive = pathname.includes("/tempo_nova/installment");

  return (
    <aside className="w-[200px] min-h-screen bg-gradient-to-br from-white/80 via-white/70 to-white/60 backdrop-blur-xl border-r border-white/20 text-[#2a515f] flex flex-col shrink-0" style={{ boxShadow: "0 8px 32px rgba(42, 81, 95, 0.1)" }}>
      {/* Logo */}
      <div className="p-4 border-b border-white/20">
        <Link href="/tempo_nova" className="block">
          <img
            src="https://storage.yandexcloud.net/domoplaner/devmedia/532/uploads/nokjt3jpvwi5knohjm8zaihh2grv9dhs.png"
            alt="Tempo Nova"
            className="w-full h-auto"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {/* Шахматка */}
        <div>
          <button
            onClick={() => setChessExpanded(!chessExpanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/30 transition-all rounded-lg mx-2 ${
              isChessActive ? "bg-white/40" : ""
            }`}
          >
            <Squares2X2Icon className="w-5 h-5" />
            <span className="flex-1 text-sm font-medium">Шахматка</span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${
                chessExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {chessExpanded && (
            <div className="ml-8 border-l border-white/20">
              {BUILDINGS.map((building) => (
                <Link
                  key={building.id}
                  href={`/tempo_nova/chess?building=${building.id}`}
                  className={`block px-4 py-2 text-sm hover:bg-white/30 transition-colors rounded ${
                    isChessActive && currentBuilding === building.id
                      ? "bg-white/40 text-[#2a515f] font-medium"
                      : "text-[#2a515f]/70"
                  }`}
                >
                  {building.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Расчет рассрочки */}
        <Link
          href="/tempo_nova/installment"
          className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg hover:bg-white/30 transition-all ${
            isInstallmentActive ? "bg-white/40" : ""
          }`}
        >
          <CalculatorIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Расчет рассрочки</span>
        </Link>

        {/* Расчет ремонта (disabled) */}
        <div className="flex items-center gap-3 px-4 py-3 text-[#2a515f]/30 cursor-not-allowed">
          <WrenchScrewdriverIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Расчет ремонта</span>
        </div>
      </nav>

      {/* Contact */}
      <div className="p-4 border-t border-white/20">
        <div className="text-xs text-[#2a515f]/50 mb-2">Отдел продаж</div>
        <a
          href="tel:+79398996992"
          className="flex items-center gap-2 text-sm hover:text-[#2a515f] transition-colors text-[#2a515f]/70"
        >
          <PhoneIcon className="w-4 h-4" />
          <span>+7 (939) 899-69-92</span>
        </a>
      </div>
    </aside>
  );
}
