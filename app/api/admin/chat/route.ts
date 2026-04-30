export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = 50;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { nickname: { contains: search, mode: "insensitive" } },
      { text: { contains: search, mode: "insensitive" } },
    ];
  }

  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.chatMessage.count({ where }),
  ]);

  return NextResponse.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (body.id) {
    await prisma.chatMessage.delete({ where: { id: body.id } });
  }
  if (body.ids && Array.isArray(body.ids)) {
    await prisma.chatMessage.deleteMany({ where: { id: { in: body.ids } } });
  }
  return NextResponse.json({ ok: true });
}
