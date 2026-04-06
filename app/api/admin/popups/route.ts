export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const popups = await prisma.popup.findMany({ orderBy: { sort: "asc" } });
  return NextResponse.json(popups);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const popup = await prisma.popup.create({
    data: {
      name: body.name || "새 팝업",
      imageUrl: body.imageUrl || "",
      linkUrl: body.linkUrl || "",
      width: body.width ?? 400,
      height: body.height ?? 500,
      posX: body.posX ?? 100,
      posY: body.posY ?? 100,
      hideToday: body.hideToday ?? true,
      isActive: body.isActive ?? true,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      sort: body.sort ?? 0,
    },
  });

  return NextResponse.json(popup, { status: 201 });
}
