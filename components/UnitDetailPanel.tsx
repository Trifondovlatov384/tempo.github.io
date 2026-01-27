"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { TempoUnit } from "@/lib/getTempoData";
import Link from "next/link";

type Props = {
  unit: TempoUnit;
  discountPercent: number;
  complexName: string | null;
  onClose: () => void;
};

export function UnitDetailPanel({ unit, discountPercent, complexName, onClose }: Props) {
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

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-gradient-to-br from-white/80 via-white/70 to-white/60 backdrop-blur-xl shadow-2xl overflow-auto border-l border-white/20" style={{ animation: "slideInRight 0.3s ease-out" }}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-white/80 via-white/70 to-white/60 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#2a515f]">
              Кв. {unit.number}
            </h2>
            {complexName && (
              <p className="text-sm text-[#2a515f]/60">{complexName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/30 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-[#2a515f]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image */}
          {unit.layoutImage && (
            <div className="rounded-lg overflow-hidden bg-white/40 border border-white/30">
              <img
                src={unit.layoutImage}
                alt={`Планировка ${unit.number}`}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Price Section */}
          <div className="bg-gradient-to-br from-white/60 via-white/50 to-white/40 backdrop-blur-md rounded-lg p-5 border border-white/30">
            <div className="text-sm font-medium text-[#2a515f]/70 mb-2">Стоимость</div>
            <div className="text-3xl font-bold text-[#b69a76] mb-1">
              {Math.round(discountedPrice / 1000000 * 10) / 10}M ₽
            </div>
            {hasDiscount && (
              <div className="text-sm text-[#2a515f]/50 line-through">
                {Math.round(unit.price / 1000000 * 10) / 10}M ₽
              </div>
            )}
            {unit.pricePerM2 && (
              <div className="text-sm text-[#2a515f]/70 mt-2 pt-2 border-t border-white/20">
                {Math.round(unit.pricePerM2 * (1 - discountPercent / 100))} ₽/м²
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCard label="Комнаты" value={`${unit.rooms}`} />
            <DetailCard label="Площадь" value={`${unit.area} м²`} />
            <DetailCard label="Этаж" value={`${unit.floor}`} />
            <DetailCard label="Статус" value={unit.statusHumanized} />
            {unit.view && <DetailCard label="Вид" value={unit.view} />}
            {unit.section && <DetailCard label="Секция" value={unit.section} />}
          </div>

          {/* Special Offer Badge */}
          {unit.hasSpecialOffer && unit.specialOfferName && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded p-4">
              <div className="text-sm font-medium text-red-700 mb-1">🎁 Спецпредложение</div>
              <div className="text-sm text-red-600">{unit.specialOfferName}</div>
            </div>
          )}

          {/* Action button */}
          {unit.status === "AVAILABLE" && (
            <Link
              href={`/tempo_nova/installment?unitId=${unit.id}&price=${discountedPrice}`}
              className="block w-full bg-gradient-to-br from-[#b69a76] to-[#a88866] text-white text-center py-3 rounded-lg font-semibold hover:from-[#a88866] hover:to-[#997656] transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Посчитать рассрочку →
            </Link>
          )}

          {unit.status !== "AVAILABLE" && (
            <div className="bg-white/30 text-[#2a515f] text-center py-3 rounded-lg font-medium border border-white/30">
              {unit.statusHumanized}
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
