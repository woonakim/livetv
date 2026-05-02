export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { computeDisplayedViewCount } from "@/lib/fake-views";


// GET: 단일 포스트 조회
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });

  const [post, siteSetting] = await Promise.all([
    prisma.analysisPost.findUnique({
      where: { id },
      include: { author: { select: { nickname: true, role: true } } },
    }),
    prisma.siteSetting.findUnique({ where: { id: 1 } }),
  ]);

  if (!post) return NextResponse.json({ error: "포스트 없음" }, { status: 404 });

  // 조회수 증가
  await prisma.analysisPost.update({ where: { id }, data: { viewCount: { increment: 1 } } });

  // 이전/다음 포스트 ID
  const [prev, next] = await Promise.all([
    prisma.analysisPost.findFirst({ where: { id: { lt: id }, isPublic: true }, orderBy: { id: "desc" }, select: { id: true } }),
    prisma.analysisPost.findFirst({ where: { id: { gt: id }, isPublic: true }, orderBy: { id: "asc" }, select: { id: true } }),
  ]);

  // 프리미엄 콘텐츠 제한
  const session = await getSession();
  const isAuthor = session?.id === post.authorId;
  const isAdmin = session?.role === "ADMIN" || session?.role === "SUPERADMIN";
  const canViewFull = !post.isPremium || isAuthor || isAdmin;

  return NextResponse.json({
    id: post.id,
    sport: post.sport,
    league: post.league,
    matchTime: post.matchTime.toISOString(),
    home: { name: post.homeTeam, logo: post.homeLogo, record: post.homeRecord },
    away: { name: post.awayTeam, logo: post.awayLogo, record: post.awayRecord },
    title: post.title,
    content: canViewFull ? post.content : "프리미엄 회원만 열람 가능합니다.",
    prediction: post.prediction,
    odds: post.odds,
    result: post.result,
    isPremium: post.isPremium,
    viewCount: computeDisplayedViewCount({ ...post, viewCount: post.viewCount + 1 }, siteSetting ?? undefined),
    realViewCount: post.viewCount + 1,
    likeCount: post.likeCount,
    createdAt: post.createdAt.toISOString(),
    author: { nickname: post.author.nickname, role: post.author.role },
    prevId: prev?.id ?? null,
    nextId: next?.id ?? null,
  });
}

// PUT: 포스트 수정 (작성자/관리자) + 결과 설정 (관리자)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });

  const post = await prisma.analysisPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "포스트 없음" }, { status: 404 });

  const isAuthor = session.id === post.authorId;
  const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";
  if (!isAuthor && !isAdmin) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // 콘텐츠 수정 (작성자/관리자)
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  if (body.prediction !== undefined) data.prediction = body.prediction;
  if (body.odds !== undefined) data.odds = body.odds;
  if (body.sport !== undefined) data.sport = body.sport;
  if (body.league !== undefined) data.league = body.league;
  if (body.matchTime !== undefined) {
    const mt = body.matchTime;
    data.matchTime = new Date(mt.includes("+") || mt.includes("Z") ? mt : mt + "+09:00");
  }
  if (body.homeTeam !== undefined) data.homeTeam = body.homeTeam;
  if (body.homeLogo !== undefined) data.homeLogo = body.homeLogo;
  if (body.homeRecord !== undefined) data.homeRecord = body.homeRecord;
  if (body.awayTeam !== undefined) data.awayTeam = body.awayTeam;
  if (body.awayLogo !== undefined) data.awayLogo = body.awayLogo;
  if (body.awayRecord !== undefined) data.awayRecord = body.awayRecord;
  if (body.isPremium !== undefined) data.isPremium = body.isPremium;

  // 결과 설정 (관리자만)
  if (body.result !== undefined && isAdmin) {
    data.result = body.result;
  }

  // 가짜 조회수 — 관리자만 변경 가능
  const touchesFake = ["fakeViewsEnabled","fakeViewsTarget","fakeViewsRampHours","fakeViewsManualSet"].some(k => body[k] !== undefined);
  if (touchesFake) {
    if (!isAdmin) return NextResponse.json({ error: "가짜 조회수는 관리자만 설정 가능" }, { status: 403 });
    // manualSet 명시적 처리 — false면 전역 설정 fallback, true면 개별 설정 적용
    if (body.fakeViewsManualSet !== undefined) {
      data.fakeViewsManualSet = !!body.fakeViewsManualSet;
    }
    if (body.fakeViewsEnabled !== undefined) {
      data.fakeViewsEnabled = !!body.fakeViewsEnabled;
      // OFF → ON 전환 시 startAt을 현재로 설정 (이미 ON이거나 이미 set되어 있으면 유지)
      if (body.fakeViewsEnabled && !post.fakeViewsStartAt) {
        data.fakeViewsStartAt = new Date();
      }
    }
    if (body.fakeViewsTarget !== undefined) data.fakeViewsTarget = Math.max(0, parseInt(body.fakeViewsTarget) || 0);
    if (body.fakeViewsRampHours !== undefined) data.fakeViewsRampHours = Math.max(1, parseInt(body.fakeViewsRampHours) || 24);
    // ramp 재시작 (옵션) — body.fakeViewsRestart === true면 startAt을 지금으로 reset
    if (body.fakeViewsRestart === true) data.fakeViewsStartAt = new Date();
  }

  await prisma.analysisPost.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE: 포스트 삭제
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const id = parseInt(params.id);
  const post = await prisma.analysisPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "포스트 없음" }, { status: 404 });

  const isAuthor = session.id === post.authorId;
  const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";
  if (!isAuthor && !isAdmin) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await prisma.analysisPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
