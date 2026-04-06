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
    const category = (formData.get("category") as string) || "general";

    if (!file) return NextResponse.json({ error: "파일 필요" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB 이하만 업로드 가능" }, { status: 400 });

    const dir = path.join(process.cwd(), "public", "uploads", category);
    await mkdir(dir, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
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
