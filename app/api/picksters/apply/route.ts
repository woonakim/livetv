export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";


// POST: 픽스터 등록 신청
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const existing = await prisma.picksterProfile.findUnique({ where: { userId: session.id } });
  if (existing) return NextResponse.json({ error: "이미 신청된 계정입니다" }, { status: 409 });

  const body = await req.json();
  const { sport, intro, monthlyFee } = body;

  if (!sport || !intro) {
    return NextResponse.json({ error: "종목, 소개글은 필수입니다" }, { status: 400 });
  }

  await prisma.picksterProfile.create({
    data: {
      userId: session.id,
      sport,
      intro,
      monthlyFee: monthlyFee || 0,
      isApproved: false,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
