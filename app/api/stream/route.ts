export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

function toAbsoluteUrl(targetUrl: string, entry: string) {
  const parsedUrl = new URL(targetUrl);
  const origin = parsedUrl.origin;
  const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

  if (entry.startsWith("http")) return entry;
  if (entry.startsWith("/")) return origin + entry;
  return baseUrl + entry;
}

async function fetchUpstream(url: string) {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://livefelix.com/",
    "Origin": "https://livefelix.com",
  };
  // Range 헤더를 전달하지 않아 업스트림이 항상 200 전체 응답을 반환하도록 함
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  return res;
}

/**
 * HLS 스트림 프록시
 * 사용: /api/stream?url=https://streaming.tootoo24tv.com/XXX.m3u8
 *
 * 외부 스트리밍 서버가 직접 브라우저 접근을 차단하므로
 * 서버 사이드에서 fetch 후 클라이언트에 전달
 */
const ALLOWED_UPSTREAM_HOSTS = [
  "lux1.hudtv01.com",
  "design.ultastream.com",
  "streaming.tootoo24tv.com",
];

function isAllowedUpstream(targetUrl: string): boolean {
  try {
    const u = new URL(targetUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_UPSTREAM_HOSTS.some(
      (h) => u.hostname === h || u.hostname.endsWith("." + h)
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url");
  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }
  if (!isAllowedUpstream(targetUrl)) {
    return new NextResponse("Upstream not allowed", { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const res = await fetchUpstream(targetUrl);
    const upstreamMs = Date.now() - startedAt;

    if (!res.ok) {
      console.warn("[stream] upstream-non-200", {
        status: res.status,
        upstreamMs,
        targetUrl,
      });
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    // m3u8 → 내부 URL도 프록시 경로로 변환
    if (contentType.includes("mpegurl") || targetUrl.endsWith(".m3u8")) {
      const text = await res.text();
      const bodyReadMs = Date.now() - startedAt - upstreamMs;
      const playlistLines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      const isMasterPlaylist = playlistLines.some((line) => line.startsWith("#EXT-X-STREAM-INF"));

      if (isMasterPlaylist) {
        const variantLine = playlistLines.find((line) => !line.startsWith("#"));
        if (variantLine) {
          const variantUrl = toAbsoluteUrl(targetUrl, variantLine);
          const variantStartedAt = Date.now();
          const variantRes = await fetchUpstream(variantUrl);
          if (variantRes.ok) {
            const variantText = await variantRes.text();
            const rewrittenVariant = variantText.replace(/^(?!#)(.+)$/gm, (match) => {
              const trimmed = match.trim();
              if (!trimmed) return match;
              return `/api/stream?url=${encodeURIComponent(toAbsoluteUrl(variantUrl, trimmed))}`;
            });

            console.info("[stream] master->variant", {
              upstreamMs,
              bodyReadMs,
              variantMs: Date.now() - variantStartedAt,
              totalMs: Date.now() - startedAt,
              targetUrl,
              variantUrl,
            });

            return new NextResponse(rewrittenVariant, {
              status: 200,
              headers: {
                "Content-Type": "application/vnd.apple.mpegurl",
                "Cache-Control": "no-cache, no-store",
                "Access-Control-Allow-Origin": "https://livefelix.com",
                "Access-Control-Allow-Methods": "GET",
              },
            });
          }
        }
      }

      // 비코멘트 라인(세그먼트, 서브 플레이리스트)을 프록시 경로로 변환
      const rewritten = text.replace(/^(?!#)(.+)$/gm, (match) => {
        const trimmed = match.trim();
        if (!trimmed) return match;
        return `/api/stream?url=${encodeURIComponent(toAbsoluteUrl(targetUrl, trimmed))}`;
      });

      console.info("[stream] playlist", {
        upstreamMs,
        bodyReadMs,
        totalMs: Date.now() - startedAt,
        targetUrl,
      });

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store",
          "Access-Control-Allow-Origin": "https://livefelix.com",
          "Access-Control-Allow-Methods": "GET",
        },
      });
    }

    // .ts 세그먼트 등 바이너리 데이터는 버퍼링하지 말고 바로 스트리밍 전달
    console.info("[stream] segment", {
      upstreamMs,
      bodyReadMs: 0,
      totalMs: Date.now() - startedAt,
      targetUrl,
      size: res.headers.get("content-length") ?? "unknown",
    });
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store",
        "Access-Control-Allow-Origin": "https://livefelix.com",
      },
    });
  } catch {
    console.warn("[stream] fetch-failed", {
      totalMs: Date.now() - startedAt,
      targetUrl,
    });
    return new NextResponse(null, { status: 502 });
  }
}
