export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { isInternalAuthorized } from "@/lib/internal-auth";
import { sendTelegram, formatNotifyMessage } from "@/lib/telegram";

// server.js의 __adminNotify에서 호출하는 텔레그램 발송 엔드포인트
export async function POST(req: NextRequest) {
  if (!isInternalAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { type, data } = await req.json();
    const msg = formatNotifyMessage(String(type), data || {});
    const r = await sendTelegram(msg);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
