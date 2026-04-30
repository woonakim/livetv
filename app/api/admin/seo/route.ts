export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { adminLog } from "@/lib/admin-log";

const SEO_FIELDS = [
  "seoTitle", "seoDescription", "seoKeywords", "seoOgImage", "seoFavicon",
  "seoNaverVerification", "seoGoogleVerification", "seoGaId", "seoRobotsTxt",
] as const;

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const settings = await prisma.siteSetting.findFirst();
  if (!settings) return NextResponse.json({});
  const result: Record<string, string> = {};
  for (const f of SEO_FIELDS) result[f] = (settings as Record<string, unknown>)[f] as string || "";
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const body = await req.json();
  const data: Record<string, string> = {};
  for (const f of SEO_FIELDS) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  await adminLog({ action: "site.seo.update", detail: data });
  return NextResponse.json({ ok: true });
}
