export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET: 내 BJ 프로필
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);

  const profile = await prisma.bjProfile.findUnique({ where: { userId: session.id } });
  return NextResponse.json(profile);
}

// PUT: 방송 설정 수정
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const profile = await prisma.bjProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return NextResponse.json({ error: "BJ 프로필 없음" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.thumbnail !== undefined) data.thumbnail = body.thumbnail;
  if (body.offlineMsg !== undefined) data.offlineMsg = body.offlineMsg;
  if (body.avatar !== undefined) data.avatar = body.avatar;
  if (body.avatarType !== undefined) data.avatarType = body.avatarType;
  if (body.statusMessage !== undefined) data.statusMessage = body.statusMessage;
  if (body.bannerUrl !== undefined) data.bannerUrl = body.bannerUrl;
  if (body.bannerText !== undefined) data.bannerText = body.bannerText;
  if (body.pinnedMessage !== undefined) data.pinnedMessage = body.pinnedMessage;
  if (body.systemMessages !== undefined) data.systemMessages = typeof body.systemMessages === "string" ? body.systemMessages : JSON.stringify(body.systemMessages);

  await prisma.bjProfile.update({ where: { id: profile.id }, data });
  return NextResponse.json({ ok: true });
}
