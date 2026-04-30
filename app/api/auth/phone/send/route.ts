export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 인증코드 메모리 캐시 (verify에서 공유)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(globalThis as any).__phoneCodeStore) (globalThis as any).__phoneCodeStore = new Map();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const codeStore: Map<string, { code: string; expiresAt: number; attempts: number; sentAt: number; dailyCount: number; dailyDate: string }> = (globalThis as any).__phoneCodeStore;

const SMS_API = "https://sms.8x8.com/api/v1/subaccounts/K2SOFT_0kK0B_hq/messages";
const SMS_TOKEN = "MWqKGLMTsdzUGXj2g6a25DL4AouC3GsezNdI0KNs";

function formatPhone(phone: string): string {
  // 01012345678 → +8201012345678
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) return `+82${cleaned.slice(1)}`;
  if (cleaned.startsWith("82")) return `+${cleaned}`;
  return `+${cleaned}`;
}

function todayStr(): string {
  const kst = new Date(Date.now() + 9 * 3600000);
  return kst.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { phone } = await req.json();
  if (!phone?.trim()) return NextResponse.json({ error: "핸드폰 번호를 입력해주세요" }, { status: 400 });

  const cleaned = phone.replace(/[^0-9]/g, "");
  if (!/^01[0-9]{8,9}$/.test(cleaned)) {
    return NextResponse.json({ error: "올바른 핸드폰 번호를 입력해주세요 (예: 01012345678)" }, { status: 400 });
  }

  const key = `${session.id}:${cleaned}`;
  const now = Date.now();
  const existing = codeStore.get(key);
  const today = todayStr();

  // 1분 내 재발송 방지
  if (existing && now - existing.sentAt < 60000) {
    const remain = Math.ceil((60000 - (now - existing.sentAt)) / 1000);
    return NextResponse.json({ error: `${remain}초 후에 재발송 가능합니다` }, { status: 429 });
  }

  // 하루 10회 제한
  const dailyCount = (existing?.dailyDate === today ? existing.dailyCount : 0);
  if (dailyCount >= 10) {
    return NextResponse.json({ error: "일일 발송 한도(10회)를 초과했습니다" }, { status: 429 });
  }

  // 6자리 코드 생성
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // 8x8 SMS 발송
  try {
    const res = await fetch(SMS_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SMS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "LIVETV",
        destination: formatPhone(cleaned),
        text: `[LiveTV] 인증번호: ${code} (5분 내 입력해주세요)`,
        encoding: "AUTO",
      }),
    });

    if (!res.ok) {
      console.error("[SMS] 발송 실패:", res.status, await res.text());
      return NextResponse.json({ error: "문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
  } catch (e) {
    console.error("[SMS] 발송 오류:", e);
    return NextResponse.json({ error: "문자 발송 중 오류가 발생했습니다" }, { status: 500 });
  }

  // 캐시 저장 (5분 유효)
  codeStore.set(key, {
    code,
    expiresAt: now + 5 * 60 * 1000,
    attempts: 0,
    sentAt: now,
    dailyCount: dailyCount + 1,
    dailyDate: today,
  });

  // 발송 로그
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "";
    await prisma.phoneVerificationLog.create({
      data: { userId: session.id, nickname: session.nickname, phone: cleaned, success: true, type: "send", ip },
    });
  } catch { /* ignore */ }

  // 오래된 캐시 정리
  for (const [k, v] of Array.from(codeStore.entries())) {
    if (now > v.expiresAt + 600000) codeStore.delete(k);
  }

  return NextResponse.json({ ok: true });
}
