import { getTempoData } from "@/lib/getTempoData";
import { ChessPageContent } from "@/components/ChessPageContent";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function ChessPage() {
  try {
    const data = await getTempoData();

    if (!data || !data.buildings?.length) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-[#2a515f]/50">Нет данных для отображения. Запустите синхронизацию фида (FEED_URL в .env и POST /api/units или cron).</p>
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

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-[#2a515f]/50">Загружается...</p>
        </div>
      }
    >
      <ChessPage />
    </Suspense>
  );
}
