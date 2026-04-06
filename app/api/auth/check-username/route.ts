import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const username = (req.nextUrl.searchParams.get("username") ?? "").toLowerCase();
  if (username.length < 4 || username.length > 12) return NextResponse.json({ available: false, message: "4~12자로 입력해주세요." });
  const exists = await prisma.user.findUnique({ where: { username } });
  return NextResponse.json({ available: !exists, message: exists ? "이미 사용중인 아이디입니다." : "사용 가능한 아이디입니다." });
}
