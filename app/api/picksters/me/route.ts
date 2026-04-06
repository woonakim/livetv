export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";


export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);

  const profile = await prisma.picksterProfile.findUnique({
    where: { userId: session.id },
  });

  return NextResponse.json(profile);
}
