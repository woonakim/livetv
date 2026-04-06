import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const partners = await prisma.partner.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const partner = await prisma.partner.create({
    data: {
      name: body.name || "",
      category: body.category || "공식제휴",
      badge: body.badge || "공식제휴",
      desc: body.desc || "",
      img: body.img || "/business.png",
      content: body.content || "",
      contact: body.contact || "1234",
      site: body.site || "#",
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return NextResponse.json(partner);
}
