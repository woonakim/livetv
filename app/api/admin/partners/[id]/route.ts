import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = parseInt(params.id);
  const data: Record<string, unknown> = {};
  for (const key of ["name", "category", "badge", "desc", "img", "content", "contact", "site"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder);
  if (body.isActive !== undefined) data.isActive = body.isActive;
  const updated = await prisma.partner.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.partner.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
