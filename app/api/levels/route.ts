export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 공개: 레벨 목록 (캐시 없음 — 관리자 저장 즉시 반영)
export async function GET() {
  const levels = await prisma.levelSetting.findMany({ orderBy: { level: "asc" } });
  return NextResponse.json(levels, {
    headers: { "Cache-Control": "no-store, must-revalidate" },
  });
}
