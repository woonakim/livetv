export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const profileId = formData.get("profileId") ? parseInt(formData.get("profileId") as string) : null;

    if (!file) return NextResponse.json({ error: "파일 필요" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "5MB 이하만 업로드 가능" }, { status: 400 });

    const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";

    // 관리자가 profileId로 다른 BJ 아바타 업로드
    let targetProfileId: number;
    if (isAdmin && profileId) {
      targetProfileId = profileId;
    } else {
      const myProfile = await prisma.bjProfile.findUnique({ where: { userId: session.id } });
      if (!myProfile) return NextResponse.json({ error: "BJ 프로필 없음" }, { status: 404 });
      targetProfileId = myProfile.id;
    }

    const dir = path.join(process.cwd(), "public", "uploads", "bj-avatar");
    await mkdir(dir, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `bj_${targetProfileId}_${Date.now()}.${ext}`;
    const savePath = path.join(dir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(savePath, buffer);

    const url = `/uploads/bj-avatar/${filename}`;

    // DB에 바로 저장
    await prisma.bjProfile.update({
      where: { id: targetProfileId },
      data: { avatar: url, avatarType: "image" },
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[bj avatar upload error]", err);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
