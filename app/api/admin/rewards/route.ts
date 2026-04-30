export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rewards = await prisma.activityReward.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rewards);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // body: { id, points, exp, isActive }
  const { id, points, exp, isActive } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (points !== undefined) data.points = parseInt(points);
  if (exp !== undefined) data.exp = parseInt(exp);
  if (isActive !== undefined) data.isActive = isActive;

  await prisma.activityReward.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
