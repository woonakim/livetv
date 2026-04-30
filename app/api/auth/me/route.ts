export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, nickname: true, role: true, points: true, exp: true, phone: true, phoneVerified: true, birthDate: true, referredBy: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
