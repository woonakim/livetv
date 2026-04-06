import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const setting = await prisma.registrationSetting.findUnique({ where: { id: 1 } });
  return NextResponse.json({ setting: setting ?? { requireName: false, requirePhone: false, requireEmail: false } });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { requireName, requirePhone, requireEmail } = await req.json();
  const setting = await prisma.registrationSetting.upsert({
    where: { id: 1 },
    update: { requireName, requirePhone, requireEmail },
    create: { id: 1, requireName, requirePhone, requireEmail },
  });
  return NextResponse.json({ setting });
}
