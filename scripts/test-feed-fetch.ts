/**
 * Тест загрузки фида с VPS (как предложил программист).
 * Запуск на сервере: npx tsx scripts/test-feed-fetch.ts
 * Нужен .env с FEED_URL (и при необходимости FEED_INSECURE_SSL=1 для теста без проверки сертификата).
 */
import "dotenv/config";
import https from "https";
import axios from "axios";

const FEED_TIMEOUT_MS = 60000;
const TLS12_CIPHERS =
  "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";

async function main() {
  const feedUrl = process.env.FEED_URL?.trim();
  if (!feedUrl?.startsWith("http")) {
    console.error("В .env задайте FEED_URL (https://...profitbase.ru/...)");
    process.exit(1);
  }

  const url = new URL(feedUrl);
  const rejectUnauthorized = process.env.FEED_INSECURE_SSL !== "1";
  const agent = new https.Agent({
    rejectUnauthorized,
    minVersion: "TLSv1.2",
    maxVersion: "TLSv1.2",
    servername: url.hostname,
    ciphers: TLS12_CIPHERS,
  });

  console.log("Загрузка фида:", feedUrl);
  console.log("rejectUnauthorized:", rejectUnauthorized);

  try {
    const response = await axios.get(feedUrl, {
      httpsAgent: agent,
      timeout: FEED_TIMEOUT_MS,
      headers: {
        Accept: "application/xml, text/xml, */*",
        "User-Agent": "Mozilla/5.0 (compatible; NovaApp/1.0)",
      },
      maxContentLength: 50 * 1024 * 1024,
      responseType: "text",
    });
    const len = typeof response.data === "string" ? response.data.length : 0;
    console.log("OK. Размер ответа:", len, "символов");
    const firstTag = String(response.data).indexOf("<");
    if (firstTag > 0) {
      console.log("До первого < отброшено", firstTag, "символов");
    }
    process.exit(0);
  } catch (error: unknown) {
    const msg = error && typeof error === "object" && "message" in error ? (error as Error).message : String(error);
    console.error("Ошибка:", msg);
    console.error("\nЕсли SSL-ошибка — попробуйте на VPS: FEED_INSECURE_SSL=1 npx tsx scripts/test-feed-fetch.ts");
    process.exit(1);
  }
}

main();
