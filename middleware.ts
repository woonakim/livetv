import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 차단 IP 캐시 (5분마다 갱신)
let bannedIps: Set<string> = new Set();
let lastFetch = 0;

async function loadBannedIps() {
  if (Date.now() - lastFetch < 5 * 60 * 1000 && bannedIps.size > 0) return;
  try {
    // Prisma는 edge에서 못 쓰므로 DB 직접 쿼리 대신 내부 fetch
    // middleware에서는 간단히 메모리 캐시 사용
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const ips = await prisma.bannedIp.findMany({ select: { ip: true } });
    bannedIps = new Set(ips.map(i => i.ip));
    lastFetch = Date.now();
    await prisma.$disconnect();
  } catch {
    // 실패 시 기존 캐시 유지
  }
}

export async function middleware(request: NextRequest) {
  // 정적 파일, API 일부는 스킵
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next") || path.startsWith("/team-logos") || path.startsWith("/uploads") || path.includes(".")) {
    return NextResponse.next();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "";

  if (ip) {
    await loadBannedIps();
    if (bannedIps.has(ip)) {
      return new NextResponse("접근이 차단되었습니다.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
