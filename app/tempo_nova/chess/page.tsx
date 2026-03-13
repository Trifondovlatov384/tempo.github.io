import { getTempoData } from "@/lib/chessboard/getTempoData";
import type { TempoComplex } from "@/lib/chessboard/getTempoData";
import { ChessPageContent } from "@/components/ChessPageContent";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const EMPTY_DATA: TempoComplex = {
  id: "tempo-nova",
  name: "ТЕМПО",
  buildings: [{ id: "empty", name: "Корпус 1", floorsTotal: 0, units: [] }],
};

async function TempoNovaChessContent() {
  let data: TempoComplex | null = null;
  try {
    data = await getTempoData();
  } catch (error) {
    console.error("Tempo Nova chess error:", error);
  }
  const displayData = data?.buildings?.length ? data : EMPTY_DATA;
  return <ChessPageContent data={displayData} />;
}

export default function TempoNovaChessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-[#2a515f]/50">Загружается...</p>
        </div>
      }
    >
      <TempoNovaChessContent />
    </Suspense>
  );
}
