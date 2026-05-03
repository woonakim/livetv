export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const SORTABLE = new Set(["id", "username", "nickname", "role", "points", "exp", "lastLoginAt", "createdAt", "isActive", "phone"]);
// "level"은 exp 기반 계산 → exp 정렬로 매핑

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = 20;
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role") || "";
  const verifiedOnly = url.searchParams.get("verifiedOnly") === "1";
  const sortField = url.searchParams.get("sort") || "id";
  const sortOrder = (url.searchParams.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const orderBy = SORTABLE.has(sortField) ? { [sortField]: sortOrder } : { id: "desc" as const };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { nickname: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (verifiedOnly) where.phoneVerified = true;

  const [users, total, levels] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, username: true, nickname: true, role: true,
        points: true, exp: true, isActive: true,
        name: true, phone: true, phoneVerified: true, email: true, referredBy: true,
        lastLoginAt: true,
        createdAt: true, _count: { select: { chatMessages: true, pointExchanges: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.levelSetting.findMany({ orderBy: { level: "asc" }, select: { level: true, name: true, badge: true, color: true, bgColor: true, requiredExp: true } }),
  ]);

  // 각 user 레벨 계산
  function calcLevel(exp: number) {
    let cur = { level: 0, name: "", badge: "", color: "#6b7280", bgColor: "#f3f4f6" };
    for (const lv of levels) {
      if (exp >= lv.requiredExp) cur = { level: lv.level, name: lv.name, badge: lv.badge, color: lv.color || "#6b7280", bgColor: lv.bgColor || "#f3f4f6" };
      else break;
    }
    return cur;
  }

  return NextResponse.json({
    users: users.map(u => ({ ...u, level: calcLevel(u.exp) })),
    total, page, totalPages: Math.ceil(total / limit),
  });
}

// Bulk action: { ids: number[], action: 'activate' | 'deactivate' | 'role:USER', adminMemo?: string }
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const ids: number[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "number") : [];
  const action: string = String(body.action || "");
  if (ids.length === 0 || !action) return NextResponse.json({ error: "ids/action required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (action === "activate") data.isActive = true;
  else if (action === "deactivate") data.isActive = false;
  else if (action.startsWith("role:")) {
    const r = action.slice(5);
    if (!["USER", "PICKSTER", "BJ", "ADMIN"].includes(r)) return NextResponse.json({ error: "invalid role" }, { status: 400 });
    if (r === "ADMIN" && session.role !== "SUPERADMIN") return NextResponse.json({ error: "SUPERADMIN만 ADMIN 부여 가능" }, { status: 403 });
    data.role = r;
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const result = await prisma.user.updateMany({ where: { id: { in: ids } }, data });
  return NextResponse.json({ ok: true, count: result.count });
}
