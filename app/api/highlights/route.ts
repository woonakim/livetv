export const dynamic = "force-dynamic";
import { fetchHighlightsByCategory } from "@/lib/youtube";
import { loadHighlightsFromDb, syncHighlights } from "@/lib/youtube-sync";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport") ?? "all";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30") || 30, 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0") || 0, 0);

  // 1. DB에서 누적 영상 조회 (cron이 주기적으로 채움)
  let videos = await loadHighlightsFromDb(sport, limit, offset);

  // 2. DB가 비어있으면 (초기 상태) 즉시 sync 시도, 실패 시 라이브 fetch fallback
  if (videos.length === 0 && offset === 0) {
    const total = await prisma.youTubeHighlight.count();
    if (total === 0) {
      try {
        await syncHighlights(30);
        videos = await loadHighlightsFromDb(sport, limit, offset);
      } catch {
        videos = await fetchHighlightsByCategory(sport === "all" ? undefined : sport);
      }
    }
  }

  return NextResponse.json(videos);
}
