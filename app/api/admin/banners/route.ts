export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clearCache } from "@/lib/cache-store";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const banners = await prisma.banner.findMany({ orderBy: { sort: "asc" } });
  return NextResponse.json(banners);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const banner = await prisma.banner.create({
    data: {
      name: body.name || "새 배너",
      imageUrl: body.imageUrl || "",
      linkUrl: body.linkUrl || "",
      position: body.position || "left_top",
      sort: body.sort ?? 0,
      isActive: body.isActive ?? true,
    },
  });

  clearCache("banners");
  return NextResponse.json(banner, { status: 201 });
}
