/**
 * При старте сервера: если в БД нет ни одного юнита — один раз подгружаем фид,
 * чтобы при открытии сайта шахматка уже была с данными (без нажатия «Обновить фид»).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  setTimeout(async () => {
    try {
      const { prisma } = await import("./lib/db/prisma");
      const count = await prisma.unit.count();
      if (count > 0) return;

      const feedUrl =
        process.env.FEED_URL || "file://feed.xml";
      const { runFeedSync } = await import("./lib/profitbase/sync");
      const result = await runFeedSync(feedUrl);
      if (result.success) {
        console.log(
          "[startup] Загружен фид:",
          result.totalBuildings,
          "корпусов,",
          result.totalUnits,
          "квартир"
        );
      } else {
        console.warn("[startup] Синк фида не удался:", result.error);
      }
    } catch (e) {
      console.warn("[startup] Проверка/загрузка фида при старте:", e);
    }
  }, 3000);
}
