export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = parseInt(params.id);
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = sanitize(body.content);
  if (body.author !== undefined) data.author = body.author;
  if (body.isPinned !== undefined) data.isPinned = body.isPinned;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  const updated = await prisma.eventBoard.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.eventBoard.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
