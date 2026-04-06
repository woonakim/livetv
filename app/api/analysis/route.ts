export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { grantReward } from "@/lib/reward";


// GET: 분석 포스트 목록
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") || "";
  const premium = searchParams.get("premium") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { isPublic: true };
  if (sport && sport !== "all") where.sport = sport;
  if (premium) where.isPremium = true;

  const [posts, total] = await Promise.all([
    prisma.analysisPost.findMany({
      where,
      include: { author: { select: { nickname: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.analysisPost.count({ where }),
  ]);

  const items = posts.map((p) => ({
    id: p.id,
    sport: p.sport,
    league: p.league,
    matchTime: p.matchTime.toISOString(),
    home: { name: p.homeTeam, logo: p.homeLogo, record: p.homeRecord },
    away: { name: p.awayTeam, logo: p.awayLogo, record: p.awayRecord },
    title: p.title,
    prediction: p.prediction,
    odds: p.odds,
    result: p.result,
    isPremium: p.isPremium,
    viewCount: p.viewCount,
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
  if (!["PICKSTER", "ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
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

  await grantReward(session.id, "analysis_write", `분석글 작성: ${title}`);

  return NextResponse.json({ id: post.id }, { status: 201 });
}
