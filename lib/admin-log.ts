import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";

interface LogParams {
  action: string;      // "user.role.change", "event.create" 등
  target?: string;     // "userId:5", "eventId:3" 등
  detail?: unknown;    // 변경 내용 (JSON으로 저장)
}

export async function adminLog({ action, target, detail }: LogParams) {
  try {
    const session = await getSession();
    if (!session) return;

    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip") || "";

    await prisma.adminLog.create({
      data: {
        userId: session.id,
        nickname: session.nickname || "",
        action,
        target: target || "",
        detail: detail ? JSON.stringify(detail) : "",
        ip,
      },
    });
  } catch (e) {
    console.error("[adminLog error]", e);
  }
}
