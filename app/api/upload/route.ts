export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "";

    // category 화이트리스트 (path traversal 방지)
    const ALLOWED_CATEGORIES = ["bj-avatar", "editor", "partners", "popups", "products", "seo", "banners", "events", "badges"];
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "허용되지 않는 카테고리입니다." }, { status: 400 });
    }

    if (!file) return NextResponse.json({ error: "파일 필요" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB 이하만 업로드 가능" }, { status: 400 });

    // 확장자 검증 (SVG 제거 — XSS 방지)
    const ALLOWED_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "ico"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json({ error: `허용되지 않는 파일 형식입니다. (${ALLOWED_EXTS.join(", ")})` }, { status: 400 });
    }

    // MIME 타입 검증
    const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json({ error: "허용되지 않는 파일 타입입니다." }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", category);
    await mkdir(dir, { recursive: true });
    const filename = `${category}_${Date.now()}.${ext}`;
    const savePath = path.join(dir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(savePath, buffer);

    const url = `/uploads/${category}/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload error]", err);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
