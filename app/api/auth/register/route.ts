export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { grantReward } from "@/lib/reward";
import { registerLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const { ok } = registerLimiter.check(ip);
    if (!ok) {
      return NextResponse.json({ error: "회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }

    const body = await req.json();
    const { password, passwordConfirm, nickname, name, phone, email, birthDate, referredBy } = body;
    const username = (body.username ?? "").toLowerCase();

    // 기본 필드 검증
    if (!username || !password || !nickname) {
      return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
    if (username.length < 4 || username.length > 12) {
      return NextResponse.json({ error: "아이디는 4~12자로 입력해주세요." }, { status: 400 });
    }
    if (nickname.length < 2 || nickname.length > 8) {
      return NextResponse.json({ error: "닉네임은 2~8자로 입력해주세요." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
    }

    // 관리자 설정 확인 (선택 필드 필수 여부)
    const setting = await prisma.registrationSetting.findUnique({ where: { id: 1 } });
    if (setting) {
      if (setting.requireName && !name) {
        return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
      }
      if (setting.requirePhone && !phone) {
        return NextResponse.json({ error: "전화번호를 입력해주세요." }, { status: 400 });
      }
      if (setting.requireEmail && !email) {
        return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
      }
      if (setting.requireBirthDate && !birthDate) {
        return NextResponse.json({ error: "생년월일을 입력해주세요." }, { status: 400 });
      }
    }
    let birthDateValue: Date | null = null;
    if (birthDate) {
      const d = new Date(birthDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: "생년월일 형식이 올바르지 않습니다." }, { status: 400 });
      birthDateValue = d;
    }

    // 중복 확인
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { nickname }] },
    });
    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ error: "이미 사용중인 아이디입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: "이미 사용중인 닉네임입니다." }, { status: 409 });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: "이미 사용중인 이메일입니다." }, { status: 409 });
      }
    }

    // 비밀번호 해시 + 회원 생성
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        nickname,
        name: name || null,
        phone: phone || null,
        email: email || null,
        birthDate: birthDateValue,
        referredBy: referredBy || null,
      },
    });

    // 회원가입 보상
    await grantReward(user.id, "signup", "회원가입 보상");

    // 추천인 보상
    if (referredBy) {
      const referrer = await prisma.user.findFirst({ where: { OR: [{ username: referredBy }, { nickname: referredBy }] } });
      if (referrer) {
        await grantReward(referrer.id, "referral", `추천인 보상 (${user.nickname} 가입)`);
      }
    }

    // JWT 발급 → 쿠키 저장
    const token = signToken({ id: user.id, username: user.username, nickname: user.nickname, role: user.role });
    const res = NextResponse.json({ ok: true, nickname: user.nickname });
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
