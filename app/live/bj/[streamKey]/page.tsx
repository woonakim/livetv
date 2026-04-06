"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface BjInfo {
  id: number; streamKey: string; nickname: string; title: string;
  description: string; category: string; isLive: boolean; viewCount: number; liveViewers: number;
}

export default function BjWatchPage() {
  const params = useParams();
  const streamKey = params.streamKey as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bj, setBj] = useState<BjInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bj/live")
      .then(r => r.json())
      .then((list: BjInfo[]) => {
        const found = list.find(b => b.streamKey === streamKey);
        setBj(found || null);
        // 시청 카운트 증가
        if (found?.isLive) {
          fetch(`/api/bj/${streamKey}`, { method: "POST" }).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [streamKey]);

  // HLS 재생
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !bj?.isLive) return;

    const flvUrl = `/live/${streamKey}.flv`;
    const hlsUrl = `/live/${streamKey}.m3u8`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let player: any = null;

    // FLV 우선 (1~2초 딜레이) → HLS fallback (3~5초)
    import("mpegts.js").then((mpegts) => {
      if (mpegts.default.isSupported()) {
        player = mpegts.default.createPlayer({
          type: "flv",
          isLive: true,
          url: flvUrl,
        }, {
          enableStashBuffer: false,
          stashInitialSize: 128,
          liveBufferLatencyChasing: true,
          liveBufferLatencyMaxLatency: 1.5,
          liveBufferLatencyMinRemain: 0.3,
        });
        player.attachMediaElement(video);
        player.load();
        player.play();
        return;
      }
      throw new Error("FLV not supported");
    }).catch(() => {
      // HLS fallback
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.play().catch(() => {});
        return;
      }
      import("hls.js").then((mod) => {
        const Hls = mod.default;
        if (!Hls.isSupported()) return;
        player = new Hls({ enableWorker: true, lowLatencyMode: true, liveSyncDurationCount: 1, liveMaxLatencyDurationCount: 3 });
        player.loadSource(hlsUrl);
        player.attachMedia(video);
        player.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      }).catch(() => {});
    });

    return () => { if (player) { try { player.destroy(); } catch {} } };
  }, [bj, streamKey]);

  if (loading) {
    return <div className="p-8 text-center"><div className="w-8 h-8 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} /></div>;
  }

  if (!bj) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-4xl mb-3">📺</p>
        <p className="text-sm font-bold">방송을 찾을 수 없습니다</p>
        <Link href="/live" className="text-xs mt-2 inline-block" style={{ color: "var(--brand)" }}>← 라이브 페이지로</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 플레이어 */}
      <div className="relative w-full bg-black aspect-video rounded-lg overflow-hidden">
        {bj.isLive ? (
          <video ref={videoRef} className="w-full h-full" autoPlay playsInline controls />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
            <span className="text-4xl mb-2">📺</span>
            <p className="text-sm">방송이 종료되었습니다</p>
          </div>
        )}
        {bj.isLive && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold px-2 py-1 rounded text-white" style={{ background: "#dc2626" }}>● LIVE</span>
          </div>
        )}
      </div>

      {/* BJ 정보 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black" style={{ background: "var(--brand)", color: "#fff" }}>
            {bj.nickname[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-base font-black" style={{ color: "var(--text-primary)" }}>{bj.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[12px] font-bold" style={{ color: "var(--brand)" }}>{bj.nickname}</span>
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>👁 {(bj.isLive ? bj.liveViewers : 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
        {bj.description && (
          <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{bj.description}</p>
        )}
      </div>
    </div>
  );
}
