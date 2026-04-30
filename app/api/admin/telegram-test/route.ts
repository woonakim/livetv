export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendTelegram } from "@/lib/telegram";

export async function POST() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const ts = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const r = await sendTelegram(`🧪 <b>테스트 알림</b>\n👤 ${session.nickname}\n🕒 ${ts}\n\n텔레그램 알림이 정상 작동합니다.`);
  return NextResponse.json(r);
}
