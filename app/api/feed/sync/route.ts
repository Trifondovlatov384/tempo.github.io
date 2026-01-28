import type { NextRequest } from "next/server";

/**
 * GET /api/feed/sync?url=<feedUrl>
 * 
 * Fetches and parses a feed from URL, returns parsed data
 * Does NOT write to database, only parses and returns
 */
export async function GET(request: NextRequest) {
  try {
    const feedUrl = request.nextUrl.searchParams.get("url");

    if (!feedUrl) {
      return Response.json(
        { success: false, error: "url parameter is required" },
        { status: 400 }
      );
    }

    // Call the units POST endpoint with the feed URL
    const response = await fetch("http://localhost:3000/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedUrl }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch units endpoint: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json(data);
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
