import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const posts = await prisma.eventBoard.findMany({ orderBy: [{ isPinned: "desc" }, { id: "desc" }] });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const post = await prisma.eventBoard.create({
    data: { title: body.title || "", content: body.content || "", author: body.author || "라이브TV", isPinned: body.isPinned ?? false },
  });
  return NextResponse.json(post);
}
