export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";
import { grantReward, todayKstDateOnly } from "@/lib/reward";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const { ok } = loginLimiter.check(ip);
    if (!ok) {
      return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const token = signToken({ id: user.id, username: user.username, nickname: user.nickname, role: user.role });

    // 로그인 기록
    const ua = req.headers.get("user-agent") || "";
    prisma.accessLog.create({
      data: { userId: user.id, type: "login", ip, userAgent: ua, path: "/login" },
    }).catch(() => {});
    // 마지막 로그인 시각 갱신 (휴면 회원 식별용 — fire-and-forget)
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    // 매일 첫 로그인 보상 — atomic claim으로 동시 로그인 중복 지급 차단
    let dailyReward: { points: number; exp: number } | null = null;
    try {
      const today = todayKstDateOnly();
      const todayUtcMidnight = new Date(today.getTime() - 9 * 3600 * 1000); // KST 0시 = 전날 UTC 15시
      // lastDailyLoginAt이 NULL이거나 KST 오늘 자정 이전일 때만 update + claim
      const claim = await prisma.user.updateMany({
        where: {
          id: user.id,
          OR: [{ lastDailyLoginAt: null }, { lastDailyLoginAt: { lt: todayUtcMidnight } }],
        },
        data: { lastDailyLoginAt: new Date() },
      });
      if (claim.count === 1) {
        dailyReward = await grantReward(user.id, "daily_login", "매일 첫 로그인 보상");
      }
    } catch {}

    const res = NextResponse.json({ ok: true, id: user.id, nickname: user.nickname, role: user.role, dailyReward });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
