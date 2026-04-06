import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src") ?? "";
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const thumbnail = req.nextUrl.searchParams.get("thumbnail") ?? "";
  const isLive = req.nextUrl.searchParams.get("live") !== "0";

  if (!src) {
    return new NextResponse("Missing src", { status: 400 });
  }

  const proxiedSrc = `/api/stream?url=${encodeURIComponent(src)}`;
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Broadcast Player</title>
    <style>
      html, body { margin: 0; padding: 0; background: #000; height: 100%; overflow: hidden; }
      .wrap { position: relative; width: 100vw; height: 100vh; background: #000; }
      .poster {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; background: #000; z-index: 0;
      }
      video { width: 100%; height: 100%; display: block; background: #000; }
      .meta {
        position: absolute; top: 8px; right: 8px; max-width: 62%;
        display: flex; align-items: center; gap: 6px; padding: 6px 8px;
        border-radius: 10px; background: rgba(0,0,0,.55); color: #fff;
        font: 600 10px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        pointer-events: none;
      }
      .badge {
        flex: 0 0 auto; padding: 3px 5px; border-radius: 999px; background: #dc2626;
        font-size: 8px; font-weight: 700;
      }
      .text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .92; }
      .loading {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 8px;
        background: rgba(0,0,0,.78); color: rgba(255,255,255,.82);
        font: 600 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .spinner {
        width: 34px; height: 34px; border-radius: 999px;
        border: 3px solid rgba(255,255,255,.18); border-top-color: #0ea5e9;
        animation: spin .8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.15/dist/hls.min.js"></script>
  </head>
  <body>
    <div class="wrap">
      ${thumbnail ? `<img id="poster" class="poster" src="${escapeHtml(thumbnail)}" alt="" />` : ""}
      <video id="player" autoplay playsinline muted controls></video>
      <div class="meta">
        <span class="badge">${isLive ? "LIVE" : "대기"}</span>
        <span class="text">${escapeHtml(league)} · ${escapeHtml(home)} vs ${escapeHtml(away)}</span>
      </div>
      <div class="loading" id="loading">
        <div class="spinner"></div>
        <div>${escapeHtml(league)}</div>
        <div style="font-size:11px;opacity:.7">${escapeHtml(home)} vs ${escapeHtml(away)}</div>
      </div>
    </div>
    <script>
      const video = document.getElementById("player");
      const loading = document.getElementById("loading");
      const poster = document.getElementById("poster");
      const src = ${JSON.stringify(proxiedSrc)};

      const hideLoading = () => {
        loading.style.display = "none";
        if (poster) poster.style.display = "none";
      };
      const showLoading = () => { loading.style.display = "flex"; };

      video.addEventListener("playing", hideLoading);
      video.addEventListener("canplay", hideLoading);
      video.addEventListener("waiting", showLoading);

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.play().catch(() => {});
      } else if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          startLevel: 0,
          testBandwidth: false,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      } else {
        video.src = src;
        video.play().catch(() => {});
      }
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
