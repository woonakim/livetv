export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Telegram Bot Webhook 자동 등록/해제
// POST { action: "register" | "delete" }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { action } = await req.json();
  const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (!setting?.telegramBotToken) return NextResponse.json({ error: "봇 토큰을 먼저 저장해주세요." }, { status: 400 });

  // public URL: NEXTAUTH_URL 또는 host 헤더 기반 추론
  const host = req.headers.get("host") || "";
  const baseUrl = process.env.NEXTAUTH_URL || `https://${host}`;
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  const secret = process.env.INTERNAL_CRON_SECRET || "";

  if (action === "register") {
    const r = await fetch(`https://api.telegram.org/bot${setting.telegramBotToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret || undefined,
        allowed_updates: ["message"],
      }),
    });
    const j = await r.json();
    return NextResponse.json({ ok: !!j.ok, webhookUrl, telegramResponse: j });
  }

  if (action === "delete") {
    const r = await fetch(`https://api.telegram.org/bot${setting.telegramBotToken}/deleteWebhook`, { method: "POST" });
    const j = await r.json();
    return NextResponse.json({ ok: !!j.ok, telegramResponse: j });
  }

  if (action === "info") {
    const r = await fetch(`https://api.telegram.org/bot${setting.telegramBotToken}/getWebhookInfo`);
    const j = await r.json();
    return NextResponse.json(j);
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
