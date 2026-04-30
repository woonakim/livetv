export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "";
}

async function logVerify(userId: number, nickname: string, phone: string, success: boolean, ip: string) {
  try {
    await prisma.phoneVerificationLog.create({
      data: { userId, nickname, phone, success, type: "verify", ip },
    });
  } catch { /* ignore */ }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { phone, code } = await req.json();
  if (!phone || !code) return NextResponse.json({ error: "번호와 인증번호를 입력해주세요" }, { status: 400 });

  const cleaned = phone.replace(/[^0-9]/g, "");
  const key = `${session.id}:${cleaned}`;
  const ip = getIp(req);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Map<string, { code: string; expiresAt: number; attempts: number }> | undefined = (globalThis as any).__phoneCodeStore;
  if (!store) {
    await logVerify(session.id, session.nickname, cleaned, false, ip);
    return NextResponse.json({ error: "인증번호를 먼저 발송해주세요" }, { status: 400 });
  }

  const entry = store.get(key);
  if (!entry) {
    await logVerify(session.id, session.nickname, cleaned, false, ip);
    return NextResponse.json({ error: "인증번호를 먼저 발송해주세요" }, { status: 400 });
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    await logVerify(session.id, session.nickname, cleaned, false, ip);
    return NextResponse.json({ error: "인증번호가 만료되었습니다. 다시 발송해주세요." }, { status: 400 });
  }

  if (entry.attempts >= 5) {
    store.delete(key);
    await logVerify(session.id, session.nickname, cleaned, false, ip);
    return NextResponse.json({ error: "인증 시도 횟수를 초과했습니다. 다시 발송해주세요." }, { status: 429 });
  }

  entry.attempts++;

  if (entry.code !== code.trim()) {
    const remain = 5 - entry.attempts;
    await logVerify(session.id, session.nickname, cleaned, false, ip);
    return NextResponse.json({ error: `인증번호가 일치하지 않습니다 (${remain}회 남음)` }, { status: 400 });
  }

  store.delete(key);
  await prisma.user.update({
    where: { id: session.id },
    data: { phone: cleaned, phoneVerified: true },
  });
  await logVerify(session.id, session.nickname, cleaned, true, ip);

  return NextResponse.json({ ok: true });
}
