export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// <script> 태그 내부에 JSON을 안전하게 임베드 (JSON-in-HTML XSS 방지)
function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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

  // Cloudflare가 서버 프록시를 차단하므로 브라우저가 직접 m3u8을 로드
  const playSrc = src;
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
      const src = ${safeJsonForScript(playSrc)};

      const MAX_HARD_RETRIES = 8;       // 최대 전체 재로드 횟수 (그 이후엔 에러 표시)
      const STALL_LIMIT_SEC = 6;        // 버퍼 정체 N초 → liveSync로 점프
      let hardRetries = 0;
      let hls = null;

      const hideLoading = () => {
        loading.style.display = "none";
        if (poster) poster.style.display = "none";
      };
      const showLoading = (msg) => {
        if (msg) {
          loading.innerHTML = '<div class="spinner"></div><div>' + msg + '</div>';
        }
        loading.style.display = "flex";
      };
      const showError = (msg) => {
        loading.innerHTML = '<div style="color:#f87171;font-size:13px;padding:16px;text-align:center">' + msg + '</div>';
        loading.style.display = "flex";
      };

      video.addEventListener("playing", () => { hideLoading(); hardRetries = 0; });
      video.addEventListener("canplay", hideLoading);
      video.addEventListener("waiting", () => showLoading("연결 중..."));

      // ── 정체 감지: currentTime이 N초 동안 변화 없으면 LIVE 끝으로 점프 ──
      let lastTime = 0;
      let stalledFor = 0;
      setInterval(() => {
        if (!video.paused && !video.ended && video.readyState >= 2) {
          if (video.currentTime === lastTime) {
            stalledFor++;
            if (stalledFor >= STALL_LIMIT_SEC) {
              // LIVE 끝점으로 점프하여 복구 시도
              try {
                if (hls && typeof hls.liveSyncPosition === "number" && isFinite(hls.liveSyncPosition)) {
                  video.currentTime = hls.liveSyncPosition;
                } else if (video.seekable.length > 0) {
                  video.currentTime = video.seekable.end(video.seekable.length - 1);
                }
              } catch {}
              stalledFor = 0;
            }
          } else {
            stalledFor = 0;
          }
          lastTime = video.currentTime;
        }
      }, 1000);

      // ── HLS.js 경로 ──
      const initHls = () => {
        if (hls) { try { hls.destroy(); } catch {} hls = null; }
        hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          // 재시도 강화 (네트워크 끊김 → 자동 복구)
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 64000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 1000,
          levelLoadingMaxRetryTimeout: 64000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          fragLoadingMaxRetryTimeout: 64000,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(window.Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          // 1) 네트워크 fatal → 잠시 후 startLoad 재시도
          if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
            showLoading("연결 재시도 중...");
            setTimeout(() => { try { hls.startLoad(); } catch {} }, 2000);
            return;
          }
          // 2) 미디어 fatal → recoverMediaError (HLS.js 내장)
          if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
            showLoading("디코더 복구 중...");
            try { hls.recoverMediaError(); return; } catch {}
          }
          // 3) 그 외 fatal → 전체 재로드 (백오프)
          hardRetries++;
          if (hardRetries <= MAX_HARD_RETRIES) {
            const delay = Math.min(2000 * hardRetries, 15000);
            showLoading("재연결 중... (" + hardRetries + "/" + MAX_HARD_RETRIES + ")");
            setTimeout(initHls, delay);
          } else {
            try { hls.destroy(); } catch {}
            showError("재생 실패: 스트림 서버에 장시간 접근 불가.<br/>잠시 후 새로고침해주세요.");
          }
        });
      };

      // ── Native HLS (Safari/iOS) 경로 — error 시 자동 reload ──
      const initNative = () => {
        video.src = src;
        video.play().catch(() => {});
        const onErr = () => {
          hardRetries++;
          if (hardRetries <= MAX_HARD_RETRIES) {
            const delay = Math.min(2000 * hardRetries, 15000);
            showLoading("재연결 중... (" + hardRetries + "/" + MAX_HARD_RETRIES + ")");
            setTimeout(() => { video.load(); video.play().catch(() => {}); }, delay);
          } else {
            showError("재생 실패: 스트림 서버에 장시간 접근 불가.<br/>잠시 후 새로고침해주세요.");
          }
        };
        video.addEventListener("error", onErr);
      };

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        initNative();
      } else if (window.Hls && window.Hls.isSupported()) {
        initHls();
      } else {
        video.src = src;
        video.play().catch(() => {});
        video.addEventListener("error", () => showError("이 브라우저는 HLS 재생을 지원하지 않습니다."));
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
