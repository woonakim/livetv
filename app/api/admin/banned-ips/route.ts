export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { adminLog } from "@/lib/admin-log";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const ips = await prisma.bannedIp.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(ips);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { ip, reason } = await req.json();
  if (!ip?.trim()) return NextResponse.json({ error: "IP 필요" }, { status: 400 });

  await prisma.bannedIp.upsert({
    where: { ip: ip.trim() },
    create: { ip: ip.trim(), reason: reason || "", bannedBy: session.nickname },
    update: { reason: reason || "", bannedBy: session.nickname },
  });
  await adminLog({ action: "ip.ban", target: ip.trim(), detail: { reason } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { ip } = await req.json();
  if (!ip) return NextResponse.json({ error: "IP 필요" }, { status: 400 });

  await prisma.bannedIp.deleteMany({ where: { ip } });
  await adminLog({ action: "ip.unban", target: ip });
  return NextResponse.json({ ok: true });
}
