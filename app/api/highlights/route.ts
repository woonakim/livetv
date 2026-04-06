import { fetchHighlightsByCategory } from "@/lib/youtube";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport") ?? "all";

  const videos = await fetchHighlightsByCategory(sport === "all" ? undefined : sport);
  return NextResponse.json(videos, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
