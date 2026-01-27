import { getTempoData } from "@/lib/getTempoData";
import { ChessPageContent } from "./ChessPageContent";
import { Suspense } from "react";

export default async function ChessPage() {
  try {
    const data = await getTempoData();
    
    if (!data || !data.buildings || data.buildings.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-[#2a515f]/50">Данные не найдены</p>
        </div>
      );
    }

    return (
      <Suspense fallback={<div>Загружается...</div>}>
        <ChessPageContent data={data} />
      </Suspense>
    );
  } catch (error) {
    console.error("Error fetching chess data:", error);
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-[#2a515f]/50">Ошибка при загрузке данных</p>
      </div>
    );
  }
}
