import { prisma } from "@/lib/prisma";
import { fetchSPOTVHighlights, type YouTubeVideo } from "@/lib/youtube";

// 채널에서 영상을 가져와 DB에 누적 저장 (upsert)
// - 신규 영상: insert + firstSeenAt 기록
// - 기존 영상: 메타데이터 갱신 + lastSeenAt 갱신
// 실패 시 기존 DB는 그대로 유지 (예외 throw)
export async function syncHighlights(maxPerChannel = 30): Promise<{ inserted: number; updated: number; total: number }> {
  const videos = await fetchSPOTVHighlights(maxPerChannel * 4);

  let inserted = 0;
  let updated = 0;

  for (const v of videos) {
    if (!v.id) continue;
    const existing = await prisma.youTubeHighlight.findUnique({ where: { videoId: v.id } });
    const channelId = inferChannelId(v.channel);
    const data = {
      title: v.title,
      channel: v.channel,
      channelId,
      thumbnail: v.thumbnail,
      publishedAt: new Date(v.publishedAt),
      category: v.category,
      league: v.league,
      homeTeam: v.homeTeam,
      awayTeam: v.awayTeam,
      isHighlight: v.isHighlight,
    };
    if (existing) {
      await prisma.youTubeHighlight.update({
        where: { videoId: v.id },
        data: { ...data, lastSeenAt: new Date() },
      });
      updated++;
    } else {
      await prisma.youTubeHighlight.create({ data: { videoId: v.id, ...data } });
      inserted++;
    }
  }
  return { inserted, updated, total: videos.length };
}

const CHANNEL_NAME_TO_ID: Record<string, string> = {
  "SPOTV": "UCtm_QoN2SIxwCE-59shX7Qg",
  "TVING SPORTS": "UC8JtQf77wqhVpOQ8Cze8JjA",
  "tvN SPORTS": "UCtybqqaTj6Nx74Azdz1KrsA",
  "LCK": "UCw1DsweY9b2AKGjV4kGJP1A",
};
function inferChannelId(channel: string): string {
  return CHANNEL_NAME_TO_ID[channel] || "";
}

// DB에서 카테고리별 하이라이트 조회
export async function loadHighlightsFromDb(category?: string, limit = 30, offset = 0): Promise<YouTubeVideo[]> {
  const rows = await prisma.youTubeHighlight.findMany({
    where: category && category !== "all" ? { category } : undefined,
    orderBy: { publishedAt: "desc" },
    take: limit,
    skip: offset,
  });
  return rows.map((r) => toYouTubeVideo(r));
}

type Row = Awaited<ReturnType<typeof prisma.youTubeHighlight.findMany>>[number];

function toYouTubeVideo(r: Row): YouTubeVideo {
  const publishedDate = r.publishedAt;
  const diffMs = Date.now() - publishedDate.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  let publishedTime = "";
  if (diffHours < 1) publishedTime = "방금 전";
  else if (diffHours < 24) publishedTime = `${diffHours}시간 전`;
  else if (diffDays < 7) publishedTime = `${diffDays}일 전`;
  else publishedTime = `${publishedDate.getMonth() + 1}월 ${publishedDate.getDate()}일`;

  const publishedDateStr = `${String(publishedDate.getMonth() + 1).padStart(2, "0")}월 ${String(publishedDate.getDate()).padStart(2, "0")}일`;

  return {
    id: r.videoId,
    title: r.title,
    channel: r.channel,
    views: "",
    publishedTime,
    publishedDate: publishedDateStr,
    publishedAt: publishedDate.getTime(),
    thumbnail: r.thumbnail || `https://i.ytimg.com/vi/${r.videoId}/hq720.jpg`,
    category: r.category,
    league: r.league,
    homeTeam: r.homeTeam,
    awayTeam: r.awayTeam,
    isHighlight: r.isHighlight,
  };
}
