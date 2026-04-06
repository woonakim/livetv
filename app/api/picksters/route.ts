import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


// GET: 픽스터 목록 (승률 포함)
export async function GET() {
  const profiles = await prisma.picksterProfile.findMany({
    where: { isApproved: true, isActive: true },
    include: { user: { select: { nickname: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  const result = await Promise.all(
    profiles.map(async (p) => {
      const [totalPicks, winPicks, recentPosts] = await Promise.all([
        prisma.analysisPost.count({ where: { authorId: p.userId, result: { not: "PENDING" } } }),
        prisma.analysisPost.count({ where: { authorId: p.userId, result: "WIN" } }),
        prisma.analysisPost.findMany({
          where: { authorId: p.userId, result: { not: "PENDING" } },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { homeTeam: true, awayTeam: true, prediction: true, result: true, odds: true },
        }),
      ]);

      const rate = totalPicks > 0 ? Math.round((winPicks / totalPicks) * 100) : 0;

      return {
        id: p.id,
        name: p.user.nickname,
        avatar: p.avatar || p.user.nickname[0],
        sport: p.sport,
        rate: `${rate}%`,
        totalPicks,
        winPicks,
        tier: p.tier,
        monthlyFee: p.monthlyFee,
        intro: p.intro,
        recentPicks: recentPosts.map((rp) => ({
          match: `${rp.homeTeam} vs ${rp.awayTeam}`,
          pick: rp.prediction,
          result: rp.result === "WIN" ? "적중" : rp.result === "LOSS" ? "실패" : "취소",
          odds: rp.odds,
        })),
      };
    })
  );

  return NextResponse.json(result);
}
