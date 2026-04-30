export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const SRS_HOST = "http://localhost:8080";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const search = req.nextUrl.search; // ?hls_ctx=... 쿼리스트링 포함
  const url = `${SRS_HOST}/${path}${search}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    // m3u8 파일은 텍스트로 읽어서 경로 재작성
    if (contentType.includes("mpegurl") || path.endsWith(".m3u8")) {
      const text = await res.text();
      // /live/... 절대경로 → /api/hls/live/... 로 변환
      const rewritten = text.replace(/^(\/live\/[^\r\n]+)/gm, "/api/hls$1");
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store",
          "Access-Control-Allow-Origin": "https://livefelix.com",
        },
      });
    }

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store",
        "Access-Control-Allow-Origin": "https://livefelix.com",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
