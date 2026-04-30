export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// 페이지별 SEO 메타데이터 생성 (서버 컴포넌트에서 호출)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "";
  const id = parseInt(searchParams.get("id") || "0");

  const base = await prisma.siteSetting.findFirst();
  const siteName = base?.seoTitle || "라이브Felix";

  let title = siteName;
  let description = base?.seoDescription || "";
  let image = base?.seoOgImage || "";

  if (type === "analysis" && id) {
    const post = await prisma.analysisPost.findUnique({ where: { id }, select: { title: true, content: true, sport: true } });
    if (post) {
      title = post.title;
      description = post.content.replace(/<[^>]*>/g, "").slice(0, 150);
    }
  } else if (type === "event" && id) {
    const event = await prisma.event.findUnique({ where: { id }, select: { title: true, teamA: true, teamB: true, bannerImg: true } });
    if (event) {
      title = event.title;
      description = `${event.teamA} vs ${event.teamB} 이벤트 매치`;
      if (event.bannerImg) image = event.bannerImg;
    }
  } else if (type === "notice" && id) {
    const notice = await prisma.notice.findUnique({ where: { id }, select: { title: true, content: true } });
    if (notice) {
      title = notice.title;
      description = notice.content.replace(/<[^>]*>/g, "").slice(0, 150);
    }
  }

  return NextResponse.json({ title, description, image, siteName });
}
