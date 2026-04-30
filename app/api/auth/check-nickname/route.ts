export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get("nickname") ?? "";
  if (nickname.length < 2 || nickname.length > 8) return NextResponse.json({ available: false, message: "2~8자로 입력해주세요." });
  const exists = await prisma.user.findUnique({ where: { nickname } });
  return NextResponse.json({ available: !exists, message: exists ? "이미 사용중인 닉네임입니다." : "사용 가능한 닉네임입니다." });
}
