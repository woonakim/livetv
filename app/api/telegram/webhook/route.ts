export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Telegram Bot Webhook 수신
// 텔레그램이 호출 → /start 응답 + 비밀번호 검증 후 구독자 등록
//
// 보안: setWebhook 시 secret_token=INTERNAL_CRON_SECRET 으로 등록
// → Telegram이 헤더 X-Telegram-Bot-Api-Secret-Token 로 같은 값 전송 → 검증
export async function POST(req: NextRequest) {
  const expected = process.env.INTERNAL_CRON_SECRET || "";
  const got = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (expected && got !== expected) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: TelegramUpdate;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const msg = update?.message;
  if (!msg?.text || !msg.chat) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const username = msg.from?.username || "";
  const firstName = msg.from?.first_name || "";

  const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (!setting?.telegramBotToken) return NextResponse.json({ ok: true });

  // /start — 안내
  if (/^\/start(\b|$)/.test(text)) {
    const existing = await prisma.telegramSubscriber.findUnique({ where: { chatId } });
    if (existing) {
      await sendReply(setting.telegramBotToken, chatId, "✅ 이미 알림을 받고 계십니다.\n구독 해제는 /stop 입력");
    } else {
      await sendReply(setting.telegramBotToken, chatId, "🔔 라이브TV 알림 봇입니다.\n알림을 받으시려면 설정한 <b>비밀번호</b>를 입력하세요.");
    }
    return NextResponse.json({ ok: true });
  }

  // /stop — 구독 해제
  if (/^\/stop(\b|$)/.test(text)) {
    await prisma.telegramSubscriber.delete({ where: { chatId } }).catch(() => {});
    await sendReply(setting.telegramBotToken, chatId, "👋 알림 구독이 해제되었습니다. 다시 받고 싶으시면 /start 입력");
    return NextResponse.json({ ok: true });
  }

  // 일반 메시지 — 비밀번호 검증
  if (!setting.telegramSubscribePasscode) {
    await sendReply(setting.telegramBotToken, chatId, "⚠️ 관리자가 아직 구독 비밀번호를 설정하지 않았습니다.");
    return NextResponse.json({ ok: true });
  }

  if (text === setting.telegramSubscribePasscode) {
    await prisma.telegramSubscriber.upsert({
      where: { chatId },
      create: { chatId, username, firstName },
      update: { username, firstName },
    });
    await sendReply(setting.telegramBotToken, chatId, "✅ 구독 완료되었습니다.\n앞으로 신청 알림을 이 채팅으로 받으실 수 있습니다.\n해제: /stop");
  } else {
    await sendReply(setting.telegramBotToken, chatId, "❌ 비밀번호가 틀렸습니다.\n다시 입력해주세요.");
  }
  return NextResponse.json({ ok: true });
}

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id: number };
    from?: { username?: string; first_name?: string };
  };
}

async function sendReply(token: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {}
}
