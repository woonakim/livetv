import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
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
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const ua = req.headers.get("user-agent") || "";
    prisma.accessLog.create({
      data: { userId: user.id, type: "login", ip, userAgent: ua, path: "/login" },
    }).catch(() => {});

    const res = NextResponse.json({ ok: true, id: user.id, nickname: user.nickname, role: user.role });
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
