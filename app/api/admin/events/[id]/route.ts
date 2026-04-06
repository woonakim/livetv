import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      votes: { include: { event: false }, orderBy: { createdAt: "desc" } },
      _count: { select: { votes: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const votesA = event.votes.filter(v => v.pick === "A").length;
  const votesB = event.votes.filter(v => v.pick === "B").length;
  return NextResponse.json({ ...event, votesA, votesB });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = parseInt(params.id);
  const data: Record<string, unknown> = {};
  for (const key of ["title", "content", "bannerImg", "bottomImg", "teamA", "teamB", "betType", "reward"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.deadline) data.deadline = new Date(body.deadline);
  if (body.isActive !== undefined) data.isActive = body.isActive;
  const updated = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.event.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
