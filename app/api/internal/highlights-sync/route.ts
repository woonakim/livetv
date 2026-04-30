export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { syncHighlights } from "@/lib/youtube-sync";
import { isInternalAuthorized } from "@/lib/internal-auth";

// 내부 cron 트리거용 sync 엔드포인트
export async function POST(req: NextRequest) {
  if (!isInternalAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const r = await syncHighlights(30);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
