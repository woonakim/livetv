export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

function parseUserAgent(ua: string) {
  let device = "desktop";
  if (/mobile|android|iphone|ipad/i.test(ua)) device = /ipad|tablet/i.test(ua) ? "tablet" : "mobile";

  let browser = "기타";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/msie|trident/i.test(ua)) browser = "IE";

  let os = "기타";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return { device, browser, os };
}

// POST: 접속/로그인 기록
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, path, referer, fingerprint } = body;

    // IP 추출 (Cloudflare → nginx → Next.js)
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const ua = req.headers.get("user-agent") || "";
    const { device, browser, os } = parseUserAgent(ua);

    // 로그인 유저 확인
    const token = req.cookies.get("livetv_token")?.value;
    const session = token ? verifyToken(token) : null;

    await prisma.accessLog.create({
      data: {
        userId: session?.id || null,
        type: type || "visit",
        ip,
        mac: fingerprint || "",
        userAgent: ua,
        device,
        browser,
        os,
        referer: referer || "",
        path: path || "",
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
