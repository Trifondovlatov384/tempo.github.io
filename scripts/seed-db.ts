/**
 * Заполняет БД из фида по URL.
 * Запуск: npm run seed
 * Требует в .env: MONGODB_URI и FEED_URL (https://...profitbase.ru/...).
 */
import "dotenv/config";
import { runFeedSync } from "../lib/profitbase/sync";

async function main() {
  const feedUrl = process.env.FEED_URL?.trim();
  if (!feedUrl || !feedUrl.startsWith("http")) {
    console.error(
      "В .env задайте FEED_URL — URL фида (https://...profitbase.ru/export/...)."
    );
    process.exit(1);
  }

  console.log("Загрузка фида:", feedUrl);
  const result = await runFeedSync(feedUrl);

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
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
