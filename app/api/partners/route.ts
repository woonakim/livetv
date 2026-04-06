import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(partners);
}
