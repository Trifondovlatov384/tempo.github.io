/**
 * Один раз заполняет БД из фида (все лоты, секции, этажи).
 * Запуск: npm run seed
 * Требует в .env: MONGODB_URI. FEED_URL по умолчанию file://feed.xml.
 * При ошибке SSL/сети при загрузке по URL автоматически пробует локальный feed.xml.
 */
import "dotenv/config";
import { runFeedSync } from "../lib/profitbase/sync";

const LOCAL_FEED = "file://feed.xml";

function isNetworkOrSslError(err: string): boolean {
  const s = err.toLowerCase();
  return (
    s.includes("ssl") ||
    s.includes("tls") ||
    s.includes("certificate") ||
    s.includes("econnrefused") ||
    s.includes("fetch") ||
    s.includes("0a000438")
  );
}

async function main() {
  const feedUrl = process.env.FEED_URL || LOCAL_FEED;
  console.log("Загрузка фида:", feedUrl);
  let result = await runFeedSync(feedUrl);

  if (!result.success && feedUrl !== LOCAL_FEED && isNetworkOrSslError(result.error || "")) {
    console.warn("Не удалось загрузить по URL (SSL/сеть). Пробуем локальный feed.xml...");
    result = await runFeedSync(LOCAL_FEED);
  }

  if (result.success) {
    console.log(
      "Готово:",
      result.totalBuildings,
      "корпусов,",
      result.totalUnits,
      "квартир."
    );
    process.exit(0);
  } else {
    console.error("Ошибка:", result.error);
    console.error("\nЕсли ошибка SSL — на VPS после деплоя выполните npm run seed там (см. DEPLOY.md).");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
