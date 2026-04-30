export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const setting = await prisma.registrationSetting.findUnique({ where: { id: 1 } });
  return NextResponse.json({ setting: setting ?? { requireName: false, requirePhone: false, requireEmail: false, requireBirthDate: false } });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const body = await req.json();
  const data: Record<string, boolean> = {};
  for (const k of ["requireName", "requirePhone", "requireEmail", "requireBirthDate"]) {
    if (body[k] !== undefined) data[k] = !!body[k];
  }
  const setting = await prisma.registrationSetting.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      requireName: !!body.requireName,
      requirePhone: !!body.requirePhone,
      requireEmail: !!body.requireEmail,
      requireBirthDate: !!body.requireBirthDate,
    },
  });
  return NextResponse.json({ setting });
}
