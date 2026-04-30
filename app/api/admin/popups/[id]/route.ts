export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clearCache } from "@/lib/cache-store";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const popup = await prisma.popup.update({
    where: { id: parseInt(params.id) },
    data: {
      name: body.name,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl,
      width: body.width,
      height: body.height,
      posX: body.posX,
      posY: body.posY,
      hideToday: body.hideToday,
      isActive: body.isActive,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      sort: body.sort,
    },
  });

  clearCache("popups");
  return NextResponse.json(popup);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  await prisma.popup.delete({ where: { id: parseInt(params.id) } });
  clearCache("popups");
  return NextResponse.json({ ok: true });
}
