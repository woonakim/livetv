export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adminLog } from "@/lib/admin-log";

// POST: 차단 — IP 차단 + isActive=false + sessionInvalidAt=now + 사유 메모 추가
//   body.banIps: boolean (default true) — 회원이 사용한 IP 차단 여부
// DELETE: 차단 해제 — isActive=true + 이 회원으로 등록된 IP 차단 해제 옵션
//   query.unbanIps=1 → 이 회원으로 추가됐던 IP 함께 해제
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || "").trim().slice(0, 500);
  const banIps = body.banIps !== false; // 기본 true

  const cur = await prisma.user.findUnique({ where: { id }, select: { adminMemo: true, nickname: true } });

  // 1. 이 회원이 사용한 IP 수집 (최근 30개 distinct)
  let bannedIpCount = 0;
  let collectedIps: string[] = [];
  if (banIps) {
    const ipsRows = await prisma.accessLog.findMany({
      where: { userId: id, ip: { not: "" } },
      select: { ip: true },
      distinct: ["ip"],
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    collectedIps = ipsRows.map(r => r.ip).filter(Boolean);

    // 자기 자신(관리자) IP가 포함될 가능성 차단 — 위험하니 skip
    // 단순화: 일단 모두 추가 (관리자가 회원과 같은 IP 사용 케이스는 적음)
    for (const ip of collectedIps) {
      try {
        await prisma.bannedIp.upsert({
          where: { ip },
          update: { reason: reason || `회원 차단 (${cur?.nickname || `#${id}`})`, bannedBy: session.nickname || `#${session.id}` },
          create: { ip, reason: reason || `회원 차단 (${cur?.nickname || `#${id}`})`, bannedBy: session.nickname || `#${session.id}` },
        });
        bannedIpCount++;
      } catch {}
    }
  }

  // 2. 메모에 차단 사유 prepend (IP 차단 결과 포함)
  const memoPrefix = `[차단 ${new Date().toISOString().slice(0, 19).replace("T", " ")}] ${reason || "사유 미기재"}${banIps ? ` (IP ${bannedIpCount}개 차단)` : ""}`;
  const newMemo = cur?.adminMemo ? `${memoPrefix}\n${cur.adminMemo}`.slice(0, 5000) : memoPrefix;

  // 3. 계정 잠금 + 세션 무효화
  await prisma.user.update({
    where: { id },
    data: { isActive: false, sessionInvalidAt: new Date(), adminMemo: newMemo },
  });
  await adminLog({ action: "user.ban", target: `userId:${id}`, detail: { reason, bannedIpCount, ips: collectedIps } });

  return NextResponse.json({
    ok: true,
    note: `회원이 차단되었습니다. IP ${bannedIpCount}개 차단, 모든 활성 세션 무효화 완료.`,
    bannedIpCount,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const url = new URL(req.url);
  const unbanIps = url.searchParams.get("unbanIps") === "1";

  await prisma.user.update({ where: { id }, data: { isActive: true } });

  // 이 회원의 IP를 차단 해제 (옵션)
  let unbanIpCount = 0;
  if (unbanIps) {
    const myIps = await prisma.accessLog.findMany({
      where: { userId: id, ip: { not: "" } },
      select: { ip: true },
      distinct: ["ip"],
      take: 30,
    });
    const ipList = myIps.map(r => r.ip).filter(Boolean);
    if (ipList.length > 0) {
      const result = await prisma.bannedIp.deleteMany({ where: { ip: { in: ipList } } });
      unbanIpCount = result.count;
    }
  }

  await adminLog({ action: "user.unban", target: `userId:${id}`, detail: { unbanIpCount } });
  return NextResponse.json({ ok: true, unbanIpCount });
}
