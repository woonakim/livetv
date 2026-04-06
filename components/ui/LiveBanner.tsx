"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface BjInfo {
  id: number; streamKey: string; nickname: string; title: string; isLive: boolean;
}

export default function LiveBanner() {
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

  if (!bj) return null;

  return (
    <>
      <Link href="/live" className="block bg-black w-full">
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "var(--brand)" }}>
          <div className="flex items-center gap-2">
            <span className="live-dot w-2 h-2 rounded-full inline-block bg-white" />
            <span className="text-white text-[12px] font-bold">🔴 실시간 방송 중</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-[11px]">{bj.nickname}</span>
            <span className="text-white text-[11px] font-bold">{bj.title}</span>
          </div>
        </div>
        <video ref={videoRef} className="w-full aspect-video" controls playsInline muted />
      </Link>
      <div className="w-full" style={{ height: 10, background: "var(--bg)" }} />
    </>
  );
}
