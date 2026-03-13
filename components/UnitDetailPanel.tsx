"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { TempoUnit } from "@/lib/chessboard/getTempoData";
import Link from "next/link";

type Props = {
  unit: TempoUnit;
  discountPercent: number;
  buildingName: string | null;
  onClose: () => void;
};

export function UnitDetailPanel({ unit, discountPercent, buildingName, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const discountedPrice = discountPercent > 0 ? Math.round(unit.price * (1 - discountPercent / 100)) : unit.price;
  const hasDiscount = discountPercent > 0 && discountedPrice !== unit.price;
  const isAvailable = (unit.status || "").toLowerCase().includes("available");

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-end">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md h-full bg-gradient-to-br from-white/95 via-white/90 to-white/85 shadow-2xl overflow-auto border-l border-[#2a515f]/10" style={{ animation: "slideInRight 0.3s ease-out" }}>
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#2a515f]/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#2a515f]">
              Квартира {unit.number}
            </h2>
            {buildingName && (
              <p className="text-sm text-[#2a515f]/70">{buildingName}</p>
            )}
            {unit.section && (
              <p className="text-xs text-[#2a515f]/50">Секция {unit.section}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a515f]/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-[#2a515f]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Планировка — крупно сверху */}
          {unit.layoutImage ? (
            <div className="rounded-xl overflow-hidden border border-[#2a515f]/15 bg-[#f8fafc]">
              <p className="text-xs font-medium text-[#2a515f]/60 px-3 py-2 border-b border-[#2a515f]/10">Планировка</p>
              <img
                src={unit.layoutImage}
                alt={`Планировка квартиры ${unit.number}`}
                className="w-full h-auto min-h-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#2a515f]/20 bg-[#f8fafc] p-8 text-center">
              <p className="text-sm text-[#2a515f]/50">Планировка не загружена</p>
            </div>
          )}

          {/* Стоимость */}
          <div className="rounded-xl bg-[#2a515f]/5 border border-[#2a515f]/10 p-5">
            <div className="text-sm font-medium text-[#2a515f]/70 mb-1">Стоимость</div>
            <div className="text-2xl font-bold text-[#2a515f]">
              {unit.price ? `${(discountedPrice / 1_000_000).toFixed(2)} млн ₽` : "—"}
            </div>
            {hasDiscount && (
              <div className="text-sm text-[#2a515f]/50 line-through mt-0.5">
                {Math.round(unit.price / 1_000_000 * 100) / 100} млн ₽
              </div>
            )}
            {unit.pricePerM2 != null && unit.pricePerM2 > 0 && (
              <div className="text-sm text-[#2a515f]/70 mt-2 pt-2 border-t border-[#2a515f]/10">
                {Math.round(unit.pricePerM2 * (1 - discountPercent / 100)).toLocaleString("ru-RU")} ₽/м²
              </div>
            )}
          </div>

          {/* Вся информация по лоту */}
          <div className="rounded-xl border border-[#2a515f]/10 overflow-hidden">
            <p className="text-xs font-medium text-[#2a515f]/60 px-3 py-2 bg-[#2a515f]/5 border-b border-[#2a515f]/10">Параметры лота</p>
            <div className="grid grid-cols-2 gap-3 p-4">
              <DetailCard label="Номер" value={unit.number} />
              <DetailCard label="Этаж" value={String(unit.floor)} />
              <DetailCard label="Комнаты" value={String(unit.rooms)} />
              <DetailCard label="Площадь" value={unit.area != null ? `${unit.area} м²` : "—"} />
              <DetailCard label="Статус" value={unit.statusHumanized || unit.status || "—"} />
              {unit.view ? <DetailCard label="Вид" value={unit.view} /> : null}
              {unit.section ? <DetailCard label="Секция" value={unit.section} /> : null}
            </div>
          </div>

          {unit.hasSpecialOffer && unit.specialOfferName && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-sm font-medium text-amber-800 mb-1">Спецпредложение</div>
              <div className="text-sm text-amber-700">{unit.specialOfferName}</div>
            </div>
          )}

          {isAvailable && (
            <Link
              href={`/tempo_nova/installment?unitId=${unit.id}&price=${discountedPrice}`}
              className="block w-full bg-[#2a515f] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#2a515f]/90 transition-colors shadow-lg"
            >
              Рассрочка →
            </Link>
          )}

          {!isAvailable && (
            <div className="rounded-xl bg-[#2a515f]/10 text-[#2a515f] text-center py-3 font-medium border border-[#2a515f]/20">
              {unit.statusHumanized || unit.status}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/40 backdrop-blur-md rounded-lg p-3 border border-white/30 hover:bg-white/50 transition-colors">
      <div className="text-xs font-medium text-[#2a515f]/60 mb-1">{label}</div>
      <div className="text-sm font-semibold text-[#2a515f]">{value}</div>
    </div>
  );
}
