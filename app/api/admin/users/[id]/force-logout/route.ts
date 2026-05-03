export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adminLog } from "@/lib/admin-log";

// 강제 로그아웃 — sessionInvalidAt = now 로 설정 → 이전 발급된 모든 JWT 무효화
// (비밀번호는 변경하지 않음)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);

  await prisma.user.update({ where: { id }, data: { sessionInvalidAt: new Date() } });
  await adminLog({ action: "user.force-logout", target: `userId:${id}`, detail: { at: new Date().toISOString() } });

  return NextResponse.json({
    ok: true,
    note: "이 회원의 모든 활성 세션이 무효화되었습니다. 다음 요청부터 자동 로그아웃됩니다.",
  });
}
