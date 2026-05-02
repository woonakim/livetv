export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { grantReward, todayKstDateOnly } from "@/lib/reward";
import { computeDisplayedViewCount } from "@/lib/fake-views";


// GET: 분석 포스트 목록
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") || "";
  const premium = searchParams.get("premium") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const upcoming = searchParams.get("upcoming") === "true";

  const where: Record<string, unknown> = { isPublic: true };
  if (sport && sport !== "all") where.sport = sport;
  if (premium) where.isPremium = true;
  if (upcoming) where.matchTime = { gte: new Date() };

  const [posts, total, siteSetting] = await Promise.all([
    prisma.analysisPost.findMany({
      where,
      include: { author: { select: { nickname: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.analysisPost.count({ where }),
    prisma.siteSetting.findUnique({ where: { id: 1 }, select: { fakeViewsAnalysisEnabled: true, fakeViewsAnalysisTargetMin: true, fakeViewsAnalysisTargetMax: true, fakeViewsAnalysisRampHours: true } }),
  ]);

  const now = new Date();
  const items = posts.map((p) => ({
    id: p.id,
    sport: p.sport,
    league: p.league,
    matchTime: p.matchTime.toISOString(),
    isPast: p.matchTime < now,
    home: { name: p.homeTeam, logo: p.homeLogo, record: p.homeRecord },
    away: { name: p.awayTeam, logo: p.awayLogo, record: p.awayRecord },
    title: p.title,
    prediction: p.prediction,
    odds: p.odds,
    result: p.result,
    isPremium: p.isPremium,
    viewCount: computeDisplayedViewCount(p, siteSetting ?? undefined),  // 가짜 부풀리기 적용된 표시값
    realViewCount: p.viewCount,                                          // 관리자용 실제값
    likeCount: p.likeCount,
    createdAt: p.createdAt.toISOString(),
    author: { nickname: p.author.nickname, role: p.author.role },
  }));

  return NextResponse.json({ items, total, page, limit });
}

// POST: 분석 포스트 작성
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  // 일반 유저 작성 허용 토글이 OFF면 픽스터/관리자만 가능
  if (!setting?.allowUserAnalysis) {
    if (!["PICKSTER", "ADMIN", "SUPERADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "분석글은 픽스터/관리자만 작성 가능합니다." }, { status: 403 });
    }
  }

  const body = await req.json();
  const { sport, league, matchTime, homeTeam, awayTeam, title, content, prediction, odds, isPremium, homeLogo, homeRecord, awayLogo, awayRecord } = body;

  if (!sport || !league || !matchTime || !homeTeam || !awayTeam || !title || !content || !prediction) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const post = await prisma.analysisPost.create({
    data: {
      authorId: session.id,
      sport,
      league,
      matchTime: new Date(matchTime.includes("+") || matchTime.includes("Z") ? matchTime : matchTime + "+09:00"),
      homeTeam,
      homeLogo: homeLogo || "",
      homeRecord: homeRecord || "",
      awayTeam,
      awayLogo: awayLogo || "",
      awayRecord: awayRecord || "",
      title,
      content,
      prediction,
      odds: odds || "",
      isPremium: isPremium || false,
    },
  });

  // 일일 보상 횟수 제한 (0=무제한) — atomic claim으로 동시 작성 race 차단
  const limit = setting?.analysisRewardDailyLimit ?? 1;
  const todayKstDate = todayKstDateOnly();
  let claimed = false;
  if (limit === 0) {
    claimed = true;
    await prisma.user.update({
      where: { id: session.id },
      data: { analysisRewardCount: { increment: 1 }, analysisRewardDate: todayKstDate },
    });
  } else {
    // 1) 새 날 시작이면 카운터 리셋 (atomic)
    await prisma.user.updateMany({
      where: {
        id: session.id,
        OR: [
          { analysisRewardDate: null },
          { analysisRewardDate: { lt: todayKstDate } },
        ],
      },
      data: { analysisRewardCount: 0, analysisRewardDate: todayKstDate },
    });
    // 2) 카운터가 limit 미만일 때만 increment (claim)
    const claim = await prisma.user.updateMany({
      where: {
        id: session.id,
        analysisRewardCount: { lt: limit },
        analysisRewardDate: todayKstDate,
      },
      data: { analysisRewardCount: { increment: 1 } },
    });
    claimed = claim.count === 1;
  }

  if (claimed) {
    await grantReward(session.id, "analysis_write", `분석글 작성: ${title}`);
  }

  return NextResponse.json({ id: post.id }, { status: 201 });
}
