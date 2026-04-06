"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import LevelBadge from "@/components/ui/LevelBadge";

interface BjInfo {
  id: number; userId: number; streamKey: string; nickname: string; title: string;
  description: string; category: string; thumbnail: string; viewCount: number; liveViewers: number; offlineMsg: string;
  avatar: string; avatarType: string; statusMessage: string; bannerUrl: string; bannerText: string;
  isLive: boolean; liveStartedAt: string | null;
}

interface ChatMsg {
  id: number; nickname: string; role: string; level?: number; text: string; userId?: number; createdAt: string;
  isPinned?: boolean;
}

interface ChatSettings {
  bannerUrl: string; bannerText: string; pinnedMessage: string;
  systemMessages: { text: string; intervalMin: number }[];
  isManager: boolean; isBjOwner: boolean;
}

const ROLE_STYLE: Record<string, { bg: string; label: string }> = {
  ADMIN: { bg: "#dc2626", label: "관리자" },
  SUPERADMIN: { bg: "#dc2626", label: "관리자" },
  PICKSTER: { bg: "#3b82f6", label: "픽스터" },
  BJ: { bg: "#9333ea", label: "BJ" },
};

function formatElapsed(startStr: string | null): string {
  if (!startStr) return "";
  const diff = Math.floor((Date.now() - new Date(startStr).getTime()) / 1000);
  if (diff < 0) return "";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export default function LivePage() {
  const [bjs, setBjs] = useState<BjInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainBj, setMainBj] = useState<BjInfo | null>(null);
  const mainBjRef = useRef<BjInfo | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const currentStreamKey = useRef<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [user, setUser] = useState<{ id: number; nickname: string; role: string } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const systemMsgTimers = useRef<ReturnType<typeof setInterval>[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [levelDisplayMode, setLevelDisplayMode] = useState<string>("badge");
  const [liveElapsed, setLiveElapsed] = useState("");
  const [chatPinnedMsg, setChatPinnedMsg] = useState<ChatMsg | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user ?? null)).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(d => setLevelDisplayMode(d.levelDisplayMode || "badge")).catch(() => {});
  }, []);

  // 방송 경과 시간 - DB의 liveStartedAt 기반
  useEffect(() => {
    const timer = setInterval(() => {
      if (mainBjRef.current?.isLive && mainBjRef.current?.liveStartedAt) {
        setLiveElapsed(formatElapsed(mainBjRef.current.liveStartedAt));
      } else {
        setLiveElapsed("");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mainBjId = mainBj?.id;
  const mainBjStreamKey = mainBj?.streamKey;
  const mainBjIsLive = mainBj?.isLive;

  // 시청 heartbeat (30초마다)
  useEffect(() => {
    if (!mainBjStreamKey || !mainBjIsLive) return;
    // 즉시 1회
    fetch(`/api/bj/${mainBjStreamKey}`, { method: "POST" }).catch(() => {});
    const hb = setInterval(() => {
      fetch(`/api/bj/${mainBjStreamKey}`, { method: "POST" }).catch(() => {});
    }, 30000);
    return () => clearInterval(hb);
  }, [mainBjStreamKey, mainBjIsLive]);

  const fetchBjs = useCallback(() => {
    fetch("/api/bj/all").then(r => r.json()).then((allData: BjInfo[]) => {
      const all = Array.isArray(allData) ? allData : [];
      setBjs(all);
      if (all.length > 0 && !mainBjRef.current) {
        const firstLive = all.find(b => b.isLive);
        const selected = firstLive || all[0];
        mainBjRef.current = selected;
        setMainBj(selected);
      } else if (mainBjRef.current) {
        const updated = all.find(b => b.id === mainBjRef.current!.id);
        if (updated) {
          mainBjRef.current = updated;
          setMainBj(prev => {
            if (!prev || prev.id !== updated.id) return prev;
            if (prev.isLive !== updated.isLive || prev.title !== updated.title || prev.liveViewers !== updated.liveViewers || prev.viewCount !== updated.viewCount) return updated;
            return prev;
          });
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBjs();
    const interval = setInterval(fetchBjs, 10000);
    return () => clearInterval(interval);
  }, [fetchBjs]);

  const selectBj = useCallback((bj: BjInfo) => {
    mainBjRef.current = bj;
    setMainBj(bj);
  }, []);

  useEffect(() => {
    if (!mainBjId) return;
    fetch(`/api/bj/chat/settings?bjId=${mainBjId}`)
      .then(r => r.json()).then(setChatSettings).catch(() => {});
  }, [mainBjId]);

  // 시스템 메시지 타이머 - 방송 중일 때만, DB에 저장
  useEffect(() => {
    systemMsgTimers.current.forEach(clearInterval);
    systemMsgTimers.current = [];
    if (!mainBjIsLive || !mainBjId || !chatSettings?.systemMessages?.length) return;
    // BJ 본인이거나 관리자만 시스템 메시지 전송
    if (!chatSettings.isBjOwner && !(user?.role === "ADMIN" || user?.role === "SUPERADMIN")) return;

    chatSettings.systemMessages.forEach((sm) => {
      if (!sm.text) return;
      const interval = setInterval(() => {
        fetch("/api/bj/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bjId: mainBjId, text: sm.text, isSystem: true }),
        }).then(() => {}).catch(() => {});
      }, (sm.intervalMin || 5) * 60 * 1000);
      systemMsgTimers.current.push(interval);
    });
    return () => { systemMsgTimers.current.forEach(clearInterval); systemMsgTimers.current = []; };
  }, [chatSettings, mainBjIsLive, mainBjId, user?.role]);

  const fetchChat = useCallback(() => {
    if (!mainBjId) return;
    fetch(`/api/bj/chat?bjId=${mainBjId}`)
      .then(r => r.json())
      .then((data: { messages: ChatMsg[]; pinnedMsg: ChatMsg | null }) => {
        const msgs = Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : []);
        setChatMessages(msgs);
        setChatPinnedMsg(data.pinnedMsg || null);
        scrollToBottom();
      }).catch(() => {});
  }, [mainBjId, scrollToBottom]);

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [fetchChat]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !user || !mainBj) return;
    if (isBanned) { alert("채팅이 차단되었습니다."); return; }
    const res = await fetch("/api/bj/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bjId: mainBj.id, text: chatInput.trim() }),
    });
    if (res.status === 403) { setIsBanned(true); alert("채팅이 차단되었습니다."); return; }
    setChatInput("");
    fetchChat();
  };

  const deleteMessage = async (msgId: number) => {
    await fetch(`/api/bj/chat?msgId=${msgId}`, { method: "DELETE" });
    setChatMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const pinMessage = async (msgId: number, pin: boolean) => {
    await fetch("/api/bj/chat/pin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId, pin }),
    });
    fetchChat();
  };

  const banUser = async (userId: number, nickname: string) => {
    if (!mainBj || !confirm(`${nickname}님을 채팅 차단하시겠습니까?`)) return;
    await fetch("/api/bj/chat/ban", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bjId: mainBj.id, userId, nickname }),
    });
    alert(`${nickname}님이 차단되었습니다.`);
  };

  const addManager = async (userId: number, nickname: string) => {
    if (!mainBj || !confirm(`${nickname}님을 매니저로 지정하시겠습니까?`)) return;
    await fetch("/api/bj/chat/manager", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bjId: mainBj.id, nickname }),
    });
    alert(`${nickname}님이 매니저로 지정되었습니다.`);
  };

  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPERADMIN");
  // 모더레이션 권한
  const canModerate = user && (
    user.role === "ADMIN" || user.role === "SUPERADMIN" ||
    chatSettings?.isBjOwner || chatSettings?.isManager
  );
  // 매니저 지정 권한: BJ 본인 또는 관리자만
  const canAssignManager = user && (
    user.role === "ADMIN" || user.role === "SUPERADMIN" || chatSettings?.isBjOwner
  );

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) { video.muted = !video.muted; setIsMuted(video.muted); }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else video.requestFullscreen().catch(() => {});
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mainBjStreamKey || !mainBjIsLive) {
      if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
      currentStreamKey.current = null;
      return;
    }
    if (currentStreamKey.current === mainBjStreamKey && playerRef.current) return;
    if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
    currentStreamKey.current = mainBjStreamKey;

    const flvUrl = `/live/${mainBjStreamKey}.flv`;
    const hlsUrl = `/live/${mainBjStreamKey}.m3u8`;

    import("mpegts.js").then((mpegts) => {
      if (mpegts.default.isSupported()) {
        const p = mpegts.default.createPlayer({ type: "flv", isLive: true, url: flvUrl, hasAudio: true, hasVideo: true }, {
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
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, liveSyncDurationCount: 1, liveMaxLatencyDurationCount: 3, liveDurationInfinity: true });
        hls.loadSource(hlsUrl); hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
        playerRef.current = hls;
      }).catch(() => {});
    });

    return () => {
      if (currentStreamKey.current === mainBjStreamKey) {
        if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
        currentStreamKey.current = null;
      }
    };
  }, [mainBjStreamKey, mainBjIsLive]);

  const otherLiveBjs = mainBj ? bjs.filter(b => b.streamKey !== mainBj.streamKey && b.isLive) : [];

  const renderAvatar = (bj: BjInfo, size: string) => {
    if (bj.avatarType === "image" && bj.avatar) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={bj.avatar} alt="" className={`${size} rounded-full object-cover`} />;
    }
    if (bj.avatar) return <span className={size === "w-11 h-11" ? "text-2xl" : "text-lg"}>{bj.avatar}</span>;
    return <span className="text-lg font-black text-white">{bj.nickname[0]}</span>;
  };

  // 시스템 메시지 판별: nickname이 "시스템"이고 userId가 없는 메시지
  const isSystemMsg = (msg: ChatMsg) => msg.nickname === "시스템" && !msg.userId;

  return (
    <div className="flex flex-col" style={{ background: "#020b18", height: "calc(100vh - 92px)", overflow: "hidden" }}>
      {bjs.length > 0 && (
        <div className="flex" style={{ background: "rgba(5,20,40,0.8)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {bjs.map(bj => (
            <button key={bj.id} onClick={() => selectBj(bj)} className="flex-1 text-center py-2.5 text-[14px] font-bold transition-all"
              style={{ color: mainBj?.streamKey === bj.streamKey ? "#fff" : "rgba(255,255,255,0.4)", borderBottom: mainBj?.streamKey === bj.streamKey ? "2px solid #fff" : "2px solid transparent" }}>
              {bj.nickname}
              {bj.isLive ? <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">ON</span> : <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/30">OFF</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* 플레이어 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-black">
          <div className="relative flex-1 min-h-0">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : mainBj?.isLive ? (
              <div className="absolute inset-0 group">
                <video ref={videoRef} className="w-full h-full object-contain bg-black" playsInline muted autoPlay />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-3 py-1 rounded text-white font-bold text-[13px]" style={{ background: "#e74c3c" }}>LIVE</span>
                  {liveElapsed && <span className="px-2 py-1 rounded text-white/70 text-[11px] font-mono" style={{ background: "rgba(0,0,0,0.5)" }}>{liveElapsed}</span>}
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-2 px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                  <button onClick={toggleMute} className="text-white/80 hover:text-white text-lg w-8 h-8 flex items-center justify-center">{isMuted ? "🔇" : "🔊"}</button>
                  <button onClick={toggleFullscreen} className="text-white/80 hover:text-white text-lg w-8 h-8 flex items-center justify-center">⛶</button>
                </div>
              </div>
            ) : mainBj ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#1e293b" }}>{renderAvatar(mainBj, "w-16 h-16")}</div>
                <p className="text-white/60 font-bold text-base">{mainBj.offlineMsg || "방송 준비 중입니다"}</p>
                <p className="text-white/30 text-xs">{mainBj.nickname}의 방송이 시작되면 자동으로 재생됩니다</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#1e293b" }}><span className="text-2xl text-white/30">📺</span></div>
                <p className="text-white/50 font-bold">등록된 BJ가 없습니다</p>
              </div>
            )}
          </div>

          {mainBj && (
            <div className="px-4 lg:px-6 py-3" style={{ background: "rgba(5,20,40,0.9)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 overflow-hidden">{renderAvatar(mainBj, "w-11 h-11")}</div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-white truncate">{mainBj.title}</div>
                    <div className="text-[12px] text-white/50 truncate mt-0.5">
                      {mainBj.nickname}
                      {mainBj.isLive && liveElapsed && <span className="ml-2 text-white/30">⏱ {liveElapsed}</span>}
                      <span className="ml-2">👁 {(mainBj.isLive ? mainBj.liveViewers : 0).toLocaleString()}</span>
                      {isAdmin && mainBj.isLive && (
                        <span className="ml-1 text-white/30">(누적 {mainBj.viewCount.toLocaleString()})</span>
                      )}
                    </div>
                  </div>
                </div>
                {mainBj.bannerUrl && (
                  <a href={mainBj.bannerUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 px-4 py-2 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                    💬 {mainBj.bannerText || "가입문의"}
                  </a>
                )}
              </div>
              {mainBj.statusMessage && (
                <div className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ background: "rgba(110,231,183,0.1)", border: "1px solid rgba(110,231,183,0.2)", color: "rgba(110,231,183,0.8)" }}>
                  📢 {mainBj.statusMessage}
                </div>
              )}
            </div>
          )}

          {mainBj?.description && (
            <div className="px-4 lg:px-6 py-2 text-[12px] text-white/40" style={{ background: "rgba(5,20,40,0.5)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{mainBj.description}</div>
          )}

          {otherLiveBjs.length > 0 && (
            <div className="px-4 py-3" style={{ background: "rgba(5,20,40,0.6)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] font-bold text-white/40 mb-2">다른 방송</p>
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {otherLiveBjs.map(bj => (
                  <button key={bj.id} onClick={() => selectBj(bj)} className="shrink-0 w-[180px] rounded-lg overflow-hidden hover:opacity-80" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="relative aspect-video bg-black flex items-center justify-center">
                      {bj.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bj.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : <span className="text-xl text-white/15">📺</span>}
                      <span className="absolute top-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#e74c3c" }}>LIVE</span>
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-white truncate">{bj.title}</p>
                      <p className="text-[10px] text-white/30">{bj.nickname}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 채팅 */}
        <div className="w-full lg:w-[368px] flex flex-col h-[50vh] lg:h-auto" style={{ background: "rgba(5,20,40,0.95)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: "rgba(0,0,0,0.15)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ border: "1px solid rgba(110,231,183,0.25)", background: "rgba(110,231,183,0.1)", color: "rgb(110,231,183)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgb(110,231,183)" }} />
              LIVE CHAT
            </span>
            {canModerate && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.2)", color: "#6ee7b7" }}>관리모드</span>}
          </div>

          {chatSettings?.bannerUrl && (
            <a href={chatSettings.bannerUrl} target="_blank" rel="noopener noreferrer"
              className="block mx-3 mt-2 px-4 py-2.5 rounded-lg text-center text-[13px] font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", boxShadow: "0 2px 8px rgba(245,158,11,0.3)" }}>
              💬 {chatSettings.bannerText || "가입문의"} 클릭
            </a>
          )}

          {chatPinnedMsg ? (
            <div className="mx-3 mt-2 px-3 py-2 rounded-lg text-[12px] font-medium flex items-center justify-between" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "rgba(147,197,253,0.9)" }}>
              <div>
                <span className="text-[10px] font-bold mr-1.5" style={{ color: "#60a5fa" }}>📌</span>
                <span className="font-bold mr-1" style={{ color: "#93c5fd" }}>{chatPinnedMsg.nickname}:</span>
                {chatPinnedMsg.text}
              </div>
              {canModerate && (
                <button onClick={() => pinMessage(chatPinnedMsg.id, false)} className="text-[9px] px-1.5 py-0.5 rounded shrink-0 ml-2" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>해제</button>
              )}
            </div>
          ) : chatSettings?.pinnedMessage ? (
            <div className="mx-3 mt-2 px-3 py-2 rounded-lg text-[12px] font-medium" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "rgba(147,197,253,0.9)" }}>
              <span className="text-[10px] font-bold mr-1.5" style={{ color: "#60a5fa" }}>📌 고정</span>
              {chatSettings.pinnedMessage}
            </div>
          ) : null}

          {/* 메시지 */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-3.5 py-2.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
            {chatMessages.length === 0 && (
              <div className="text-center text-[12px] text-white/25 italic py-4">채팅에 참여하려면 로그인이 필요합니다.</div>
            )}
            {chatMessages.map(msg => {
              if (isSystemMsg(msg)) {
                return (
                  <div key={msg.id} className="mb-2 px-3 py-1.5 rounded text-[11px] font-medium text-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "rgba(253,224,71,0.9)" }}>
                    ⚡ {msg.text}
                  </div>
                );
              }
              const rs = ROLE_STYLE[msg.role];
              const isHovered = hoveredMsg === msg.id;
              return (
                <div key={msg.id} className="relative mb-1.5 flex items-start"
                  onMouseEnter={() => canModerate ? setHoveredMsg(msg.id) : undefined}
                  onMouseLeave={() => setHoveredMsg(null)}>
                  <div className="flex-1 text-[13px] leading-relaxed break-words min-w-0" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {levelDisplayMode !== "none" && typeof msg.level === "number" && (
                      <LevelBadge level={msg.level} mode={levelDisplayMode as "badge" | "emoji" | "none"} />
                    )}
                    {rs && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white mr-1" style={{ background: rs.bg }}>{rs.label}</span>}
                    <span className="font-bold" style={{ color: rs?.bg || "#60a5fa" }}>{msg.nickname} : </span>
                    <span>{msg.text}</span>
                  </div>
                  {/* hover 시 오른쪽 버튼 */}
                  {canModerate && isHovered && (
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      <button onClick={() => pinMessage(msg.id, true)} title="고정"
                        className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-blue-500/30" style={{ color: "#60a5fa" }}>📌</button>
                      <button onClick={() => deleteMessage(msg.id)} title="삭제"
                        className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-red-500/30" style={{ color: "#f87171" }}>✕</button>
                      {msg.userId && (
                        <button onClick={() => banUser(msg.userId!, msg.nickname)} title="차단"
                          className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-orange-500/30" style={{ color: "#fbbf24" }}>🚫</button>
                      )}
                      {canAssignManager && msg.userId && (
                        <button onClick={() => addManager(msg.userId!, msg.nickname)} title="매니저 지정"
                          className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-green-500/30" style={{ color: "#6ee7b7" }}>👔</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-3.5 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {user ? (
              isBanned ? (
                <div className="text-center text-[13px] py-1" style={{ color: "rgba(239,68,68,0.7)" }}>채팅이 차단되었습니다.</div>
              ) : (
                <div className="flex gap-1.5">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="채팅 입력..." maxLength={100}
                    className="flex-1 rounded-lg px-3 py-2 text-[14px] focus:outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                  <button onClick={sendMessage} className="px-4 py-2 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>전송</button>
                </div>
              )
            ) : (
              <div className="text-center text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                🔒 채팅에 참여하려면 <span className="text-sky-400">로그인</span>이 필요합니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
