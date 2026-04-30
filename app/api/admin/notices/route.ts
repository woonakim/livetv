export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const notices = await prisma.notice.findMany({ orderBy: [{ isPinned: "desc" }, { id: "desc" }] });
  return NextResponse.json(notices);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const notice = await prisma.notice.create({
    data: {
      title: body.title || "",
      content: sanitize(body.content || ""),
      author: body.author || "라이브TV",
      isPinned: body.isPinned ?? false,
    },
  });
  return NextResponse.json(notice);
}
