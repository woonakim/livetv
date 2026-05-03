import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set");
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const COOKIE_NAME = "livetv_token";

export interface JwtPayload {
  id: number;
  username: string;
  nickname: string;
  role: string;
}

interface JwtPayloadWithIat extends JwtPayload {
  iat: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(req?: { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<JwtPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }
  if (!token) return null;
  const decoded = verifyToken(token) as JwtPayloadWithIat | null;
  if (!decoded) return null;
  // 강제 로그아웃 / 비활성화 / 차단 검증
  try {
    const u = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { isActive: true, sessionInvalidAt: true },
    });
    if (!u) return null;
    if (!u.isActive) return null;
    if (u.sessionInvalidAt && decoded.iat) {
      const issuedAtMs = decoded.iat * 1000;
      if (issuedAtMs < u.sessionInvalidAt.getTime()) return null;
    }
  } catch {
    // DB 실패 시 일단 토큰 신뢰 (가용성 우선)
  }
  return { id: decoded.id, username: decoded.username, nickname: decoded.nickname, role: decoded.role };
}

export { COOKIE_NAME };
