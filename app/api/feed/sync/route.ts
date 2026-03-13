import { runFeedSync } from "@/lib/profitbase/sync";
import type { NextRequest } from "next/server";

/**
 * GET /api/feed/sync
 * GET /api/feed/sync?url=<feedUrl>
 * Синхронизирует фид в БД. Если url не передан — используется FEED_URL из .env.
 */
export async function GET(request: NextRequest) {
  try {
    const feedUrl =
      request.nextUrl.searchParams.get("url") ||
      process.env.FEED_URL ||
      "file://feed.xml";

    if (!feedUrl) {
      return Response.json(
        {
          success: false,
          error:
            "url parameter or FEED_URL in .env is required. Example: /api/feed/sync?url=https://...",
        },
        { status: 400 }
      );
    }

    const result = await runFeedSync(feedUrl);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      totalBuildings: result.totalBuildings,
      totalUnits: result.totalUnits,
    });
  } catch (error) {
    console.error("Feed sync error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
