export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// CSV 내보내기 — 현재 필터 조건과 동일하게 적용
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role") || "";
  const verifiedOnly = url.searchParams.get("verifiedOnly") === "1";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) where.OR = [
    { nickname: { contains: search, mode: "insensitive" } },
    { username: { contains: search, mode: "insensitive" } },
    { name: { contains: search, mode: "insensitive" } },
  ];
  if (role) where.role = role;
  if (verifiedOnly) where.phoneVerified = true;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, username: true, nickname: true, role: true,
      points: true, exp: true, isActive: true,
      name: true, phone: true, phoneVerified: true, email: true, referredBy: true,
      lastLoginAt: true, createdAt: true,
    },
    orderBy: { id: "desc" },
  });

  // CSV 생성 (UTF-8 BOM + 헤더 + 레코드)
  const cols = ["ID", "아이디", "닉네임", "등급", "이름", "전화", "인증", "이메일", "추천인", "포인트", "EXP", "활성", "마지막로그인", "가입일"];
  const escape = (v: string | null | number | boolean) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows: string[] = [cols.join(",")];
  for (const u of users) {
    rows.push([
      u.id, u.username, u.nickname, u.role,
      u.name || "", u.phone || "", u.phoneVerified ? "Y" : "N",
      u.email || "", u.referredBy || "",
      u.points, u.exp,
      u.isActive ? "Y" : "N",
      u.lastLoginAt?.toISOString().slice(0, 19).replace("T", " ") || "",
      u.createdAt.toISOString().slice(0, 19).replace("T", " "),
    ].map(escape).join(","));
  }
  const csv = "﻿" + rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
