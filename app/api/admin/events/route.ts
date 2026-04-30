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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const event = await prisma.event.create({
    data: {
      title: body.title || "",
      content: sanitize(body.content || ""),
      bannerImg: body.bannerImg || "",
      bottomImg: body.bottomImg || "",
      teamA: body.teamA || "",
      teamB: body.teamB || "",
      betType: body.betType || "승패",
      reward: body.reward || "10,000원 포인트",
      deadline: new Date(body.deadline),
    },
  });
  await adminLog({ action: "event.create", target: `eventId:${event.id}`, detail: body });
  return NextResponse.json(event);
}
