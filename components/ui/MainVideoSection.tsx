"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface BjInfo {
  id: number; streamKey: string; nickname: string; title: string; isLive: boolean;
}

export default function MainVideoSection() {
  const [bj, setBj] = useState<BjInfo | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const check = () => {
      fetch("/api/bj/live").then(r => r.json()).then((data: BjInfo[]) => {
        const live = Array.isArray(data) ? data.find(b => b.isLive) : null;
        setBj(live || null);
      }).catch(() => setBj(null));
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !bj) return;

    if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }

    const flvUrl = `/live/${bj.streamKey}.flv`;
    const hlsUrl = `/live/${bj.streamKey}.m3u8`;

    import("mpegts.js").then((mpegts) => {
      if (mpegts.default.isSupported()) {
        const p = mpegts.default.createPlayer({ type: "flv", isLive: true, url: flvUrl }, {
          enableStashBuffer: false, stashInitialSize: 128,
          liveBufferLatencyChasing: true, liveBufferLatencyMaxLatency: 1.5, liveBufferLatencyMinRemain: 0.3,
        });
        p.attachMediaElement(video); p.load(); p.play();
        playerRef.current = p;
      } else { throw new Error("no flv"); }
    }).catch(() => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl; video.play().catch(() => {}); return;
      }
      import("hls.js").then((mod) => {
        const Hls = mod.default;
        if (!Hls.isSupported()) return;
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, liveSyncDurationCount: 1, liveMaxLatencyDurationCount: 3 });
        hls.loadSource(hlsUrl); hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
        playerRef.current = hls;
      }).catch(() => {});
    });

    return () => { if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; } };
  }, [bj]);

  // BJ 방송 중 → 실시간 영상
  if (bj) {
    return (
      <Link href="/live" className="block w-full rounded-lg overflow-hidden bg-black" style={{ border: "1px solid #f3f4f6" }}>
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "var(--brand)" }}>
          <div className="flex items-center gap-2">
            <span className="live-dot w-2 h-2 rounded-full inline-block bg-white" />
            <span className="text-white text-[12px] font-bold">🔴 실시간 방송 중</span>
          </div>
          <span className="text-white/90 text-[11px] font-bold">{bj.nickname} · {bj.title}</span>
        </div>
        <div className="relative">
          <video ref={videoRef} className="w-full aspect-video" playsInline muted style={{ filter: "blur(3px)" }} />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <i className="fas fa-play text-white text-xl ml-1" />
            </div>
            <p className="text-white text-sm font-bold">시청하시려면 방송을 클릭하세요</p>
            <p className="text-white/60 text-xs">{bj.nickname} · {bj.title}</p>
          </div>
        </div>
      </Link>
    );
  }

  // BJ 방송 없음 → 기본 영상
  return (
    <div className="w-full rounded-lg overflow-hidden bg-black" style={{ border: "1px solid #f3f4f6" }}>
      <video src="/livetv_nowater.mp4" className="w-full aspect-video" autoPlay loop muted playsInline />
    </div>
  );
}
