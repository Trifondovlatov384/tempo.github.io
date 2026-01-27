"use client";

import { Suspense } from "react";

function InstallmentContent() {
  return (
    <div className="flex items-center justify-center h-96">
      <p className="text-[#2a515f]/50">Калькулятор рассрочки - в разработке</p>
    </div>
  );
}

export default function InstallmentPage() {
  return (
    <Suspense fallback={<div>Загружается...</div>}>
      <InstallmentContent />
    </Suspense>
  );
}
