import { prisma } from "@/lib/prisma";

// 텔레그램 봇 메시지 발송 — 등록된 모든 구독자에게 broadcast
// SiteSetting.telegramNotifyEnabled=false 또는 token 미설정 또는 구독자 0명이면 no-op
export async function sendTelegram(message: string): Promise<{ ok: boolean; sent: number; failed: number; error?: string }> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    if (!setting?.telegramNotifyEnabled) return { ok: false, sent: 0, failed: 0, error: "disabled" };
    if (!setting.telegramBotToken) return { ok: false, sent: 0, failed: 0, error: "token not configured" };

    const subscribers = await prisma.telegramSubscriber.findMany({ select: { chatId: true } });
    if (subscribers.length === 0) return { ok: false, sent: 0, failed: 0, error: "no subscribers" };

    const url = `https://api.telegram.org/bot${setting.telegramBotToken}/sendMessage`;
    let sent = 0, failed = 0;
    await Promise.all(
      subscribers.map(async (s) => {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: s.chatId,
              text: message,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) sent++; else failed++;
        } catch { failed++; }
      })
    );
    return { ok: sent > 0, sent, failed };
  } catch (e) {
    return { ok: false, sent: 0, failed: 0, error: (e as Error).message };
  }
}

// 알림 type → 텔레그램 메시지 문자열 변환
export function formatNotifyMessage(type: string, data: Record<string, unknown>): string {
  const ts = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const escape = (s: string) => String(s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));
  const nick = escape(String(data.nickname || "?"));

  switch (type) {
    case "exchange_apply":
      return `💰 <b>포인트 교환 신청</b>\n👤 ${nick}\n🎁 ${escape(String(data.product || ""))}\n🕒 ${ts}`;
    case "bj_apply":
      return `🎬 <b>BJ 등록 신청</b>\n👤 ${nick}\n🕒 ${ts}`;
    case "pickster_apply":
      return `📊 <b>픽스터 등록 신청</b>\n👤 ${nick}\n🕒 ${ts}`;
    default:
      return `🔔 <b>${escape(type)}</b>\n${escape(JSON.stringify(data))}\n🕒 ${ts}`;
  }
}
