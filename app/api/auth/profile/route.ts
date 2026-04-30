export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 마이페이지 프로필 갱신
// - birthDate: 1회 등록 후 잠금 (이미 값이 있으면 변경 불가, 관리자만 가능)
//   atomic: updateMany({where: {birthDate: null}}) 로 동시 PATCH race 차단
// - phone: 변경 시 phoneVerified=false 자동 리셋 (보안: 인증된 번호로 위장 방지)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();

  // ── birthDate 1회 등록 (atomic) ──
  if (body.birthDate !== undefined) {
    if (!body.birthDate || typeof body.birthDate !== "string") {
      return NextResponse.json({ error: "생년월일 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const d = new Date(body.birthDate);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "생년월일 형식이 올바르지 않습니다." }, { status: 400 });
    }
    // birthDate가 null일 때만 atomic update
    const claim = await prisma.user.updateMany({
      where: { id: session.id, birthDate: null },
      data: { birthDate: d },
    });
    if (claim.count === 0) {
      return NextResponse.json({ error: "생년월일은 이미 등록되어 있습니다. 변경은 관리자에게 문의해주세요." }, { status: 400 });
    }
  }

  // ── phone 변경 시 phoneVerified=false 리셋 ──
  if (body.phone !== undefined) {
    if (typeof body.phone !== "string") {
      return NextResponse.json({ error: "휴대폰 번호 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const newPhone = body.phone.trim();
    // 현재 번호와 다를 때만 verified 리셋
    const u = await prisma.user.findUnique({ where: { id: session.id }, select: { phone: true } });
    const phoneChanged = u?.phone !== newPhone;
    await prisma.user.update({
      where: { id: session.id },
      data: phoneChanged ? { phone: newPhone, phoneVerified: false } : { phone: newPhone },
    });
  }

  if (body.birthDate === undefined && body.phone === undefined) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
