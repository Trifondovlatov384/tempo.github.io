import { getTempoData } from "@/lib/getTempoData";
import { ChessPageContent } from "./ChessPageContent";
import { Suspense } from "react";

async function ChessPageLoading() {
  try {
    const data = await getTempoData();
    
    if (!data || !data.buildings || data.buildings.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-[#2a515f]/50">Нет данных для отображения</p>
        </div>
      );
    }

    return <ChessPageContent data={data} />;
  } catch (error) {
    console.error("Chess page error:", error);
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-[#2a515f]/50 mb-4">Ошибка при загрузке данных</p>
          <p className="text-sm text-[#2a515f]/30">{String(error)}</p>
        </div>
      </div>
    );
  }
}

export default function ChessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <p className="text-[#2a515f]/50">Загружается...</p>
      </div>
    }>
      <ChessPageLoading />
    </Suspense>
  );
}
