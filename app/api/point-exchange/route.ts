export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcLevel } from "@/lib/level";

// 교환 신청
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { productId } = await req.json();
  const product = await prisma.pointProduct.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "유저 정보 오류" }, { status: 400 });

  // 레벨 락업 (관리자 설정)
  const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (setting?.exchangeLockEnabled) {
    const levels = await prisma.levelSetting.findMany({ select: { level: true, requiredExp: true } });
    const userLevel = calcLevel(user.exp, levels);
    if (userLevel < setting.exchangeMinLevel) {
      return NextResponse.json(
        { error: `${setting.exchangeMinLevel}레벨 이상부터 교환 신청이 가능합니다. (현재 ${userLevel}레벨)`, needLevel: setting.exchangeMinLevel, currentLevel: userLevel },
        { status: 403 }
      );
    }
  }

  if (!user.phoneVerified) {
    return NextResponse.json({ error: "핸드폰 인증이 필요합니다. 인증 후 다시 시도해주세요.", needVerify: true }, { status: 403 });
  }
  if (user.points < product.price) {
    return NextResponse.json({ error: `포인트가 부족합니다. (보유: ${user.points.toLocaleString()}P / 필요: ${product.price.toLocaleString()}P)` }, { status: 400 });
  }

  // 트랜잭션: 포인트 차감 + 교환 기록 + 포인트 로그
  const [exchange] = await prisma.$transaction([
    prisma.pointExchange.create({
      data: { userId: session.id, amount: product.price, productName: product.name },
    }),
    prisma.user.update({
      where: { id: session.id },
      data: { points: { decrement: product.price } },
    }),
    prisma.pointLog.create({
      data: { userId: session.id, type: "EXCHANGE", amount: product.price, reason: `포인트 교환: ${product.name}` },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).__adminNotify === "function") (globalThis as any).__adminNotify("exchange_apply", { nickname: session.nickname, product: product.name });

  return NextResponse.json({ ok: true, exchange });
}

// 내 교환 내역
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const exchanges = await prisma.pointExchange.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(exchanges);
}
