export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";


export async function POST(req: NextRequest) {
  try {
    // formData 요청에서는 cookies()를 직접 사용
    const token = req.cookies.get("livetv_token")?.value;
    const session = token ? verifyToken(token) : null;
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const profileIdStr = formData.get("profileId") as string | null;
    const profileId = profileIdStr ? parseInt(profileIdStr) : 0;

    if (!file) return NextResponse.json({ error: "파일 필요" }, { status: 400 });

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하로 제한됩니다" }, { status: 400 });
    }

    const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";
    let profile;

    if (profileId && isAdmin) {
      profile = await prisma.picksterProfile.findUnique({ where: { id: profileId } });
    } else {
      profile = await prisma.picksterProfile.findUnique({ where: { userId: session.id } });
    }

    if (!profile) return NextResponse.json({ error: "픽스터 프로필 없음" }, { status: 404 });

    // 확장자 + MIME 검증
    const ALLOWED_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];
    const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext) || !ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json({ error: "이미지 파일만 업로드 가능합니다." }, { status: 400 });
    }

    // 디렉토리 보장
    const dir = path.join(process.cwd(), "public", "pickster-avatars");
    await mkdir(dir, { recursive: true });
    const filename = `pickster_${profile.id}_${Date.now()}.${ext}`;
    const savePath = path.join(dir, filename);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(savePath, Buffer.from(arrayBuffer));

    const avatarPath = `/pickster-avatars/${filename}`;

    await prisma.picksterProfile.update({
      where: { id: profile.id },
      data: { avatar: avatarPath },
    });

    return NextResponse.json({ avatar: avatarPath });
  } catch (err) {
    console.error("[avatar upload error]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
