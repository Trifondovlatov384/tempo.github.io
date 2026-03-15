import { appendFileSync } from "fs";
import { join } from "path";
import { getTempoData } from "@/lib/chessboard/getTempoData";
import type { TempoComplex } from "@/lib/chessboard/getTempoData";
import { ChessPageContent } from "@/components/ChessPageContent";
import { Suspense } from "react";

const DEBUG_LOG_PATH = join(process.cwd(), ".cursor", "debug-7d6a34.log");

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
  // #region agent log
  try {
    const line = JSON.stringify({
      sessionId: "7d6a34",
      location: "chess/page.tsx",
      message: "displayData",
      data: {
        dataIsNull: data === null,
        dataBuildingsLength: data?.buildings?.length ?? 0,
        usingEmptyData: displayData === EMPTY_DATA,
        displayDataBuildingsLength: displayData.buildings.length,
      },
      timestamp: Date.now(),
      hypothesisId: "C_E",
    }) + "\n";
    appendFileSync(DEBUG_LOG_PATH, line);
  } catch (_) {}
  // #endregion
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
