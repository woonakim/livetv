export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { currentPassword, newPassword, confirmPassword } = await req.json();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "모든 항목을 입력해주세요" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "새 비밀번호가 일치하지 않습니다" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: session.id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
