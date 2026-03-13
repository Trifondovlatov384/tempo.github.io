/**
 * Вызов синка фида по расписанию (cron).
 * Работает только с 8:00 до 23:00; не чаще раза в 30 минут.
 * На VPS: */30 8-22 * * * curl -s http://localhost:3000/api/cron/sync-feed
 */
import { runFeedSync } from "@/lib/profitbase/sync";
import type { NextRequest } from "next/server";

const THROTTLE_MS = 30 * 60 * 1000; // 30 минут
let lastSyncTime = 0;

function isInWindow(): boolean {
  const hour = new Date().getHours();
  // 8:00 - 22:59 (cron */30 даст последний запуск в 22:30)
  return hour >= 8 && hour < 23;
}

export async function GET(_request: NextRequest) {
  const feedUrl = process.env.FEED_URL || "file://feed.xml";
  if (!feedUrl) {
    return Response.json(
      { ok: false, error: "FEED_URL not set" },
      { status: 503 }
    );
  }

  if (!isInWindow()) {
    return Response.json(
      { ok: true, skipped: true, reason: "outside 8:00-23:00" },
      { status: 200 }
    );
  }

  const now = Date.now();
  if (now - lastSyncTime < THROTTLE_MS) {
    return Response.json(
      { ok: true, skipped: true, reason: "throttled (30 min)" },
      { status: 200 }
    );
  }

  lastSyncTime = now;
  const result = await runFeedSync(feedUrl);

  if (!result.success) {
    return Response.json(
      { ok: false, error: result.error },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    totalBuildings: result.totalBuildings,
    totalUnits: result.totalUnits,
  });
}
