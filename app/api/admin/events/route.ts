export const dynamic = "force-dynamic";
import { adminLog } from "@/lib/admin-log";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const events = await prisma.event.findMany({
    orderBy: { id: "desc" },
    include: { _count: { select: { votes: true } } },
  });
  return NextResponse.json(events);
}

// datetime-local 입력은 타임존 없는 문자열 — Z/+00:00 등 표기 없으면 KST(+09:00)로 간주
function parseDeadlineKst(s: string): Date {
  if (!s) return new Date();
  if (s.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  return new Date(s + "+09:00");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const betType = body.betType || "승패";
  // 승무패 → allowDraw=true 자동 설정 (UI에서 무승부 버튼 노출)
  const allowDraw = body.allowDraw !== undefined ? !!body.allowDraw : betType === "승무패";
  const event = await prisma.event.create({
    data: {
      title: body.title || "",
      content: sanitize(body.content || ""),
      bannerImg: body.bannerImg || "",
      bottomImg: body.bottomImg || "",
      teamA: body.teamA || "",
      teamB: body.teamB || "",
      betType,
      betLine: body.betLine || "",
      reward: body.reward || "10,000원 포인트",
      rewardPoints: (typeof body.rewardPoints === "number" && body.rewardPoints >= 0) ? body.rewardPoints : null,
      deadline: parseDeadlineKst(body.deadline),
      allowDraw,
    },
  });
  await adminLog({ action: "event.create", target: `eventId:${event.id}`, detail: body });
  return NextResponse.json(event);
}
