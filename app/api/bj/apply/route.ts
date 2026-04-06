export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// POST: BJ 등록 신청
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const existing = await prisma.bjProfile.findUnique({ where: { userId: session.id } });
  if (existing) return NextResponse.json({ error: "이미 신청된 계정입니다" }, { status: 409 });

  // 고유 스트림키 생성
  const streamKey = `bj_${crypto.randomBytes(12).toString("hex")}`;

  await prisma.bjProfile.create({
    data: {
      userId: session.id,
      streamKey,
      isApproved: false,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
