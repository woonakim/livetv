export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { execFileSync } from "child_process";
import { writeFileSync, existsSync, statSync, unlinkSync } from "fs";
import { join } from "path";

function safeFilename(s: string): string {
  return s.replace(/[/\\:*?"<>|()]/g, "").replace(/\s+/g, "_");
}

function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const allowed = [
      "thesportsdb.com",
      "www.thesportsdb.com",
      "upload.wikimedia.org",
      "static.lolesports.com",
      "lux1.hudtv01.com",
    ];
    return allowed.some((d) => u.hostname === d || u.hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { kr?: string; nameEn?: string; sport?: string; league?: string; imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kr = (body.kr || "").trim();
  const nameEn = (body.nameEn || "").trim();
  const sport = (body.sport || "").trim();
  const league = (body.league || "").trim();
  const imageUrl = (body.imageUrl || "").trim();

  if (!kr || !sport || !imageUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "Image URL domain not allowed" }, { status: 400 });
  }

  // 다운로드
  const filename = safeFilename(kr) + ".png";
  const outDir = join(process.cwd(), "public", "team-logos");
  const outPath = join(outDir, filename);
  const tmpPath = outPath + ".raw";

  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/121.0",
        "Referer": "https://en.wikipedia.org/",
      },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 500) throw new Error("too small");
    // HTML 응답 차단
    const head = buf.slice(0, 20).toString("utf8");
    if (/<!DOCTYPE|<html/i.test(head)) throw new Error("HTML response");
    writeFileSync(tmpPath, buf);
  } catch (e) {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    return NextResponse.json({ error: `Download failed: ${(e as Error).message}` }, { status: 502 });
  }

  // ffmpeg로 300px 리사이즈
  try {
    execFileSync("ffmpeg", ["-y", "-i", tmpPath, "-vf", "scale=300:-1", outPath], { stdio: "ignore" });
    unlinkSync(tmpPath);
    if (!existsSync(outPath) || statSync(outPath).size < 500) throw new Error("resize output invalid");
  } catch (e) {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    return NextResponse.json({ error: `Resize failed: ${(e as Error).message}` }, { status: 500 });
  }

  // cwebp로 WebP 생성
  try {
    const webpPath = outPath.replace(/\.png$/, ".webp");
    execFileSync("cwebp", ["-q", "85", outPath, "-o", webpPath], { stdio: "ignore" });
  } catch {
    // WebP 실패해도 PNG는 살아있음
  }

  // DB 업서트
  const logoPath = `/team-logos/${filename}`;
  // (nameKr, sport) 복합 unique → sport 필수 매칭
  const existing = await prisma.teamLogo.findFirst({ where: { nameKr: kr, sport } });
  const data = {
    logoPath,
    nameEn: nameEn || "",
    sport,
    league,
    isActive: true,
  };
  if (existing) {
    await prisma.teamLogo.update({ where: { id: existing.id }, data });
  } else {
    await prisma.teamLogo.create({ data: { nameKr: kr, ...data } });
  }

  // 감사 로그
  try {
    await prisma.adminLog.create({
      data: {
        userId: session.id,
        nickname: session.nickname,
        action: "team_logo.save",
        target: kr,
        detail: JSON.stringify({ sport, league, imageUrl, logoPath }),
      },
    });
  } catch {
    // 로그 실패 허용
  }

  return NextResponse.json({ ok: true, logoPath });
}
