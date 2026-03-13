/**
 * Качает фид и выводит только XML в stdout (без логов).
 * Вызывается из sync.ts через subprocess — в этом процессе TLS на VPS работает.
 * Запуск: FEED_URL=<url> npx tsx scripts/feed-fetch-stdout.ts
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
    console.error("FEED_URL not set or invalid");
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
    let xml = typeof response.data === "string" ? response.data : String(response.data);
    const firstTag = xml.indexOf("<");
    if (firstTag > 0) xml = xml.slice(firstTag);
    process.stdout.write(xml);
    process.exit(0);
  } catch (error: unknown) {
    const msg = error && typeof error === "object" && "message" in error ? (error as Error).message : String(error);
    console.error(msg);
    process.exit(1);
  }
}

main();
