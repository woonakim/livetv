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
  const banner = await prisma.banner.update({
    where: { id: parseInt(params.id) },
    data: {
      name: body.name,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl,
      position: body.position,
      sort: body.sort,
      isActive: body.isActive,
    },
  });

  clearCache("banners");
  return NextResponse.json(banner);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  await prisma.banner.delete({ where: { id: parseInt(params.id) } });
  clearCache("banners");
  return NextResponse.json({ ok: true });
}
