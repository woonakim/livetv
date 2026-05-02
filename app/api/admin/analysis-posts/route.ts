export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { computeDisplayedViewCount } from "@/lib/fake-views";

// GET: 전체 분석글 목록 (관리자용 — 가짜 조회수 설정 노출)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const sport = searchParams.get("sport") || "";

  const where: Record<string, unknown> = {};
  if (sport && sport !== "all") where.sport = sport;

  const [posts, total, siteSetting] = await Promise.all([
    prisma.analysisPost.findMany({
      where,
      include: { author: { select: { nickname: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.analysisPost.count({ where }),
    prisma.siteSetting.findUnique({ where: { id: 1 } }),
  ]);

  return NextResponse.json({
    items: posts.map(p => ({
      id: p.id,
      title: p.title,
      sport: p.sport,
      league: p.league,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      isPremium: p.isPremium,
      isPublic: p.isPublic,
      result: p.result,
      viewCount: p.viewCount,
      displayedViewCount: computeDisplayedViewCount(p, siteSetting ?? undefined),
      likeCount: p.likeCount,
      fakeViewsEnabled: p.fakeViewsEnabled,
      fakeViewsTarget: p.fakeViewsTarget,
      fakeViewsRampHours: p.fakeViewsRampHours,
      fakeViewsStartAt: p.fakeViewsStartAt?.toISOString() ?? null,
      fakeViewsManualSet: p.fakeViewsManualSet,
      author: { nickname: p.author.nickname, role: p.author.role },
      createdAt: p.createdAt.toISOString(),
    })),
    total, page, limit,
    global: siteSetting ? {
      enabled: siteSetting.fakeViewsAnalysisEnabled,
      targetMin: siteSetting.fakeViewsAnalysisTargetMin,
      targetMax: siteSetting.fakeViewsAnalysisTargetMax,
      rampHours: siteSetting.fakeViewsAnalysisRampHours,
    } : null,
  });
}
