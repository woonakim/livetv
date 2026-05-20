"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LevelBadge from "@/components/ui/LevelBadge";
import { getSocket } from "@/lib/socket";

// 외부 링크 정규화 — 프로토콜 누락 시 https:// 자동 prefix (기존 DB의 't.me/...' 호환)
function normalizeUrl(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface BjInfo {
  id: number; userId: number; streamKey: string; nickname: string; title: string;
  description: string; category: string; thumbnail: string; viewCount: number; liveViewers: number; offlineMsg: string;
  avatar: string; avatarType: string; statusMessage: string; bannerUrl: string; bannerText: string;
  isLive: boolean; liveStartedAt: string | null;
  bufferLatency?: number;
  realViewers?: number; // 관리자용 실제값 (REST에서 부풀리기 적용 후 별도 필드로 분리)
}

interface ChatMsg {
  id: number; nickname: string; role: string; level?: number; text: string; userId?: number | null; createdAt: string;
  isPinned?: boolean;
  guestId?: string;       // 비회원 메시지 식별자 (mod 차단 버튼용)
  isPresence?: boolean;   // 클라이언트 임시 입/퇴장 알림 (mod-only 수신, DB 미저장)
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
  return (
    <Suspense fallback={null}>
      <LivePageInner />
    </Suspense>
  );
}

function LivePageInner() {
  const [bjs, setBjs] = useState<BjInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainBj, setMainBj] = useState<BjInfo | null>(null);
  const mainBjRef = useRef<BjInfo | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const currentStreamKey = useRef<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatFocused, setChatFocused] = useState(false);  // 키보드 open 시 모바일 채팅 레이아웃 전환
  const [user, setUser] = useState<{ id: number; nickname: string; role: string } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);
  const [managerIds, setManagerIds] = useState<Set<number>>(new Set());
  const [isBanned, setIsBanned] = useState(false);
  const systemMsgTimers = useRef<ReturnType<typeof setInterval>[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [audioInteracted, setAudioInteracted] = useState(false);  // 사용자가 오디오에 한번이라도 개입했는지
  const [volume, setVolume] = useState(1);
  const [showVolumeHint, setShowVolumeHint] = useState(false);
  const volumeHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [levelDisplayMode, setLevelDisplayMode] = useState<string>("badge");
  const [liveElapsed, setLiveElapsed] = useState("");
  const [chatPinnedMsg, setChatPinnedMsg] = useState<ChatMsg | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [bjViewerCount, setBjViewerCount] = useState<number | null>(null);
  const [bjViewerReal, setBjViewerReal] = useState<number | null>(null);

  // 관리자용 — 현재 접속자 목록 (admin:online-users 수신) -> felix대표 피드백 필요함
  const [onlineList, setOnlineList] = useState<{ members: { nickname: string }[]; guests: { nickname: string }[]; count: number }>({ members: [], guests: [], count: 0 });
  const [showOnlineList, setShowOnlineList] = useState(false);

  // 비회원 게스트 식별자 — localStorage 기반, 브라우저 단위로 유지
  // guestId: 차단/식별용 UUID-like / guestName: 화면 표시용 "손님XXXXXX"
  const [guest, setGuest] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let id = localStorage.getItem("livetv_guest_id");
    let name = localStorage.getItem("livetv_guest_name");
    if (!id) {
      id = `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      localStorage.setItem("livetv_guest_id", id);
    }
    if (!name) {
      name = `손님${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem("livetv_guest_name", name);
    }
    setGuest({ id, name });
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  }, []);

  useEffect(() => {
    const refetchUser = () => {
      fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(d => setUser(d.user ?? null)).catch(() => {});
    };
    refetchUser();
    fetch("/api/site-settings").then(r => r.json()).then(d => setLevelDisplayMode(d.levelDisplayMode || "badge")).catch(() => {});
    // MainLayout이 로그인/로그아웃 시 dispatch하는 auth-changed 이벤트를 listen
    window.addEventListener("auth-changed", refetchUser);
    // socket connect도 보조 트리거 (재연결 시 cookie 갱신 케이스)
    const s = getSocket();
    s.on("connect", refetchUser);
    return () => {
      window.removeEventListener("auth-changed", refetchUser);
      s.off("connect", refetchUser);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (volumeHintTimer.current) clearTimeout(volumeHintTimer.current);
    };
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
        // URL ?bj=streamKey 가 있으면 해당 BJ 우선 선택 -> BJ 개별 선택용임
        const qsKey = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("bj") : null;
        const fromQuery = qsKey ? all.find(b => b.streamKey === qsKey) : null;
        const firstLive = all.find(b => b.isLive);
        const selected = fromQuery || firstLive || all[0];
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

  // 모바일 — visualViewport 기반 height + chatFocused 자동 감지 (키보드 열림)
  // body/html/main bg 강제 다크 (iOS Chrome :has() 미지원 환경 대응)
  // position:fixed 사용 안 함 (iOS Safari hit-test 버그 회피)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 1024) return;

    const main = document.querySelector("main") as HTMLElement | null;
    const wrapper = main?.parentElement as HTMLElement | null; // min-h-screen 외곽 wrapper
    const prev = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      htmlBg: document.documentElement.style.background,
      bodyBg: document.body.style.background,
      mainBg: main?.style.background ?? "",
      mainHeight: main?.style.height ?? "",
      mainMinHeight: main?.style.minHeight ?? "",
      mainOverflow: main?.style.overflow ?? "",
      wrapperHeight: wrapper?.style.height ?? "",
      wrapperMinHeight: wrapper?.style.minHeight ?? "",
      wrapperOverflow: wrapper?.style.overflow ?? "",
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // 흰 영역 노출 방지 — html/body/main 모두 다크 강제
    document.documentElement.style.background = "#020b18";
    document.body.style.background = "#020b18";
    if (main) {
      main.style.background = "#020b18";
      main.style.overflow = "hidden";
    }
    if (wrapper) {
      wrapper.style.overflow = "hidden";
      wrapper.style.minHeight = "0"; // min-h-screen 무효화
    }

    const updateVh = () => {
      const vv = window.visualViewport;
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--live-vh", `${h}px`);
      // 외곽 wrapper와 main을 visualViewport에 묶음 — .live-shell 아래 빈 공간 노출 차단
      // (iOS input scroll-into-view가 발동할 layout viewport 갭 자체를 제거)
      if (wrapper) wrapper.style.height = `${h}px`;
      if (main) main.style.height = `${h - 56}px`; // 모바일 헤더 56px 제외
      // iOS Safari가 input focus 시 문서 자체를 빈 배경 영역으로 밀어두는 경우가 있어
      // live 화면은 항상 상단 기준으로 되돌린다.
      window.scrollTo(0, 0);
      // 키보드 열림 감지는 input의 onFocus/onBlur가 처리 — iOS 17.4+ interactive-widget=resizes-content에서
      // window.innerHeight와 visualViewport.height가 함께 줄어들어 viewport 수학 감지가 작동 안 함
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    };
    updateVh();
    window.visualViewport?.addEventListener("resize", updateVh);
    window.visualViewport?.addEventListener("scroll", updateVh);
    // iOS lazy 갱신 보완 — focus/blur 직후 한번 더
    const onFocus = () => { setTimeout(updateVh, 50); setTimeout(updateVh, 250); };
    const onBlur = () => { setTimeout(updateVh, 100); setTimeout(updateVh, 400); };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateVh);
      window.visualViewport?.removeEventListener("scroll", updateVh);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.documentElement.style.overflow = prev.htmlOverflow;
      document.body.style.overflow = prev.bodyOverflow;
      document.documentElement.style.background = prev.htmlBg;
      document.body.style.background = prev.bodyBg;
      if (main) {
        main.style.background = prev.mainBg;
        main.style.height = prev.mainHeight;
        main.style.minHeight = prev.mainMinHeight;
        main.style.overflow = prev.mainOverflow;
      }
      if (wrapper) {
        wrapper.style.height = prev.wrapperHeight;
        wrapper.style.minHeight = prev.wrapperMinHeight;
        wrapper.style.overflow = prev.wrapperOverflow;
      }
      document.documentElement.style.removeProperty("--live-vh");
    };
  }, []);

  // URL ?bj=streamKey 변경 시 해당 BJ로 전환 (드롭다운에서 다른 BJ 클릭 케이스)
  const searchParams = useSearchParams();
  const qsKey = searchParams.get("bj");
  useEffect(() => {
    if (!qsKey || bjs.length === 0) return;
    const target = bjs.find(b => b.streamKey === qsKey);
    if (target && mainBjRef.current?.streamKey !== qsKey) {
      selectBj(target);
    }
  }, [qsKey, bjs, selectBj]);

  useEffect(() => {
    if (!mainBjId) return;
    fetch(`/api/bj/chat/settings?bjId=${mainBjId}`)
      .then(r => r.json()).then(setChatSettings).catch(() => {});
    // 매니저 목록 (채팅 메시지 렌더링 시 스패너 표시용)
    fetch(`/api/bj/chat/manager?bjId=${mainBjId}`)
      .then(r => r.json())
      .then((list: { userId: number }[]) => {
        if (Array.isArray(list)) setManagerIds(new Set(list.map(m => m.userId)));
      })
      .catch(() => {});
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
        getSocket().emit("bj:send", { bjId: mainBjId, text: sm.text, isSystem: true });
      }, (sm.intervalMin || 5) * 60 * 1000);
      systemMsgTimers.current.push(interval);
    });
    return () => { systemMsgTimers.current.forEach(clearInterval); systemMsgTimers.current = []; };
  }, [chatSettings, mainBjIsLive, mainBjId, user?.role]);

  // BJ 채팅 Socket.IO
  useEffect(() => {
    if (!mainBjId) return;
    setChatLoading(true);  // BJ 변경 시 로딩 상태로
    const s = getSocket();

    const onInit = (data: { messages: ChatMsg[]; pinnedMsg: ChatMsg | null }) => {
      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
      setChatPinnedMsg(data.pinnedMsg || null);
      setChatLoading(false);
      scrollToBottom();
    };
    const onMessage = (msg: ChatMsg) => {
      setChatMessages(prev => [...prev, msg]);
      scrollToBottom();
    };
    const onDeleted = (msgId: number) => {
      setChatMessages(prev => prev.filter(m => m.id !== msgId));
    };
    const onPinned = (pinnedMsg: ChatMsg | null) => {
      setChatPinnedMsg(pinnedMsg || null);
    };
    const onError = (data: { error: string }) => {
      if (data.error) { setIsBanned(true); }
    };
    const onViewer = (data: { bjId: number; count: number; real: number }) => {
      if (data.bjId !== mainBjId) return;
      setBjViewerCount(data.count);
      setBjViewerReal(data.real);
    };
    // 입/퇴장 알림 (mod-room 수신자만 받음) — chatMessages 에 임시 메시지로 push
    const onPresence = (data: { bjId: number; kind: "enter" | "leave"; nickname: string; ts: number }) => {
      if (data.bjId !== mainBjId) return;
      const msg: ChatMsg = {
        id: -data.ts - Math.floor(Math.random() * 1000), // 음수 id 로 DB 메시지와 충돌 회피
        nickname: "",
        role: "PRESENCE",
        text: `${data.nickname}님이 ${data.kind === "enter" ? "입장" : "퇴장"}했습니다.`,
        createdAt: new Date(data.ts).toISOString(),
        isPresence: true,
      };
      setChatMessages(prev => [...prev, msg]);
      scrollToBottom();
    };

    // 리스너 먼저 등록 (init 이벤트 누락 방지)
    s.on("bj:init", onInit);
    s.on("bj:message", onMessage);
    s.on("bj:deleted", onDeleted);
    s.on("bj:pinned", onPinned);
    s.on("bj:error", onError);
    s.on("viewer:bj", onViewer);
    s.on("bj:presence", onPresence);

    // join — 현재 연결 상태에 따라 즉시 또는 connect 시
    const join = () => s.emit("bj:join", { bjId: mainBjId, guestId: guest?.id, guestName: !user ? guest?.name : undefined });
    if (s.connected) join();
    s.on("connect", join);  // 재연결 시에도 자동 재가입

    return () => {
      s.emit("bj:leave", { bjId: mainBjId });
      s.off("bj:init", onInit);
      s.off("bj:message", onMessage);
      s.off("bj:deleted", onDeleted);
      s.off("bj:pinned", onPinned);
      s.off("bj:error", onError);
      s.off("viewer:bj", onViewer);
      s.off("bj:presence", onPresence);
      s.off("connect", join);
      setBjViewerCount(null);
      setBjViewerReal(null);
    };
  }, [mainBjId, scrollToBottom, user, guest?.id, guest?.name]);

  const sendMessage = () => {
    if (!chatInput.trim() || !mainBj) return;
    if (isBanned) { alert("채팅이 차단되었습니다."); return; }
    if (user) {
      getSocket().emit("bj:send", { bjId: mainBj.id, text: chatInput.trim() });
    } else if (guest) {
      getSocket().emit("bj:send", { bjId: mainBj.id, text: chatInput.trim(), guestId: guest.id, guestName: guest.name });
    } else {
      return;
    }
    setChatInput("");
  };

  const deleteMessage = (msgId: number) => {
    if (!mainBj) return;
    getSocket().emit("bj:delete", { bjId: mainBj.id, msgId });
  };

  const pinMessage = (msgId: number, pin: boolean) => {
    if (!mainBj) return;
    getSocket().emit("bj:pin", { bjId: mainBj.id, msgId, pin });
  };

  const banUser = async (userId: number, nickname: string) => {
    if (!mainBj || !confirm(`${nickname}님을 채팅 차단하시겠습니까?`)) return;
    await fetch("/api/bj/chat/ban", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bjId: mainBj.id, userId, nickname }),
    });
    alert(`${nickname}님이 차단되었습니다.`);
  };

  const banGuest = async (guestId: string, nickname: string) => {
    if (!mainBj || !confirm(`${nickname}님(비회원)을 채팅 차단하시겠습니까?`)) return;
    await fetch("/api/bj/chat/ban", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bjId: mainBj.id, guestId, nickname }),
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

  // 관리자만: admin room 가입 + 현재 시청 중인 BJ 방송 접속자 목록 수신
  useEffect(() => {
    if (!isAdmin) return;
    const s = getSocket();
    const onOnline = (data: { bjId?: number; members: { nickname: string }[]; guests: { nickname: string }[]; count: number }) => {
      // mainBjId 와 다른 BJ 변동 알림은 무시
      if (!mainBjId) return;
      if (data?.bjId && data.bjId !== mainBjId) return;
      setOnlineList(data || { members: [], guests: [], count: 0 });
    };
    s.on("admin:online-users", onOnline);
    const join = () => {
      s.emit("admin:join");
      if (mainBjId) s.emit("admin:online-users:refresh", { bjId: mainBjId });
    };
    if (s.connected) join();
    s.on("connect", join);
    return () => {
      s.off("admin:online-users", onOnline);
      s.off("connect", join);
    };
  }, [isAdmin, mainBjId]);
  // 매니저 지정 권한: BJ 본인 또는 관리자만
  const canAssignManager = user && (
    user.role === "ADMIN" || user.role === "SUPERADMIN" || chatSettings?.isBjOwner
  );

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      if (!video.muted && video.volume === 0) video.volume = volume || 1;
      setIsMuted(video.muted);
      setAudioInteracted(true);  // 한 번이라도 음소거 해제하면 오버레이 다시 안 뜸
      if (!nextMuted && window.matchMedia("(max-width: 639px)").matches) {
        setShowVolumeHint(true);
        if (volumeHintTimer.current) clearTimeout(volumeHintTimer.current);
        volumeHintTimer.current = setTimeout(() => setShowVolumeHint(false), 2600);
      }
    }
  };

  const changeVolume = (value: number) => {
    const nextVolume = Math.max(0, Math.min(1, value));
    setVolume(nextVolume);
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setIsMuted(video.muted);
    setAudioInteracted(true);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    // 1) 일반 Fullscreen API
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = video as any;
    // 2) iOS Safari 전용 — video element 자체를 풀스크린
    if (typeof v.webkitEnterFullscreen === "function") {
      try { v.webkitEnterFullscreen(); return; } catch {}
    }
    // 3) Webkit prefix fallback
    if (typeof v.webkitRequestFullscreen === "function") {
      try { v.webkitRequestFullscreen(); return; } catch {}
    }
    // 4) 비디오를 감싼 컨테이너로 시도
    const container = video.closest('[data-player-container]') as HTMLElement | null;
    if (container?.requestFullscreen) {
      container.requestFullscreen().catch(() => {});
      return;
    }
    video.requestFullscreen().catch(() => {});
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
    // BJ가 설정한 방송 딜레이(시청자 버퍼). 1.5(저지연) ~ 10초.
    const targetLatency = Math.max(1.5, Math.min(10, mainBj?.bufferLatency ?? 3.5));
    const minRemain = Math.max(0.3, targetLatency / 4);
    // HLS는 segment 단위(약 1초). target/1초 만큼의 segment 수 = sync count
    const hlsSync = Math.max(1, Math.round(targetLatency));
    const hlsMax = Math.max(hlsSync + 1, Math.round(targetLatency * 1.7));

    import("mpegts.js").then((mpegts) => {
      if (mpegts.default.isSupported()) {
        const p = mpegts.default.createPlayer({ type: "flv", isLive: true, url: flvUrl, hasAudio: true, hasVideo: true }, {
          enableStashBuffer: false, stashInitialSize: 128,
          liveBufferLatencyChasing: true, liveBufferLatencyMaxLatency: targetLatency, liveBufferLatencyMinRemain: minRemain,
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
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, liveSyncDurationCount: hlsSync, liveMaxLatencyDurationCount: hlsMax, liveDurationInfinity: true });
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
    <div className="flex flex-col live-shell" style={{ background: "#020b18", overflow: "hidden" }}>
      <style>{`
        /* 모바일: position:fixed 사용 X — iOS Safari 키보드 후 hit-test 버그 회피 */
        /* 모바일은 JS가 main의 height를 vv.height - 56으로 강제 → live-shell은 100% */
        .live-shell {
          height: 100%;
          transition: height 0.15s ease-out;
        }
        @media (min-width: 1024px) {
          .live-shell {
            height: calc(100vh - 92px);
            transition: none;
          }
        }
        /* 페이지 배경 통일 */
        body:has(.live-shell) { background: #020b18 !important; overscroll-behavior: none; }
      `}</style>
      {bjs.length > 0 && (
        <div className={`flex overflow-x-auto ${chatFocused ? "hidden lg:flex" : ""}`} style={{ background: "rgba(5,20,40,0.8)", borderBottom: "1px solid rgba(255,255,255,0.1)", scrollbarWidth: "none" }}>
          {bjs.map(bj => (
            <button key={bj.id} onClick={() => selectBj(bj)}
              className="shrink-0 lg:flex-1 text-center px-3 py-1.5 lg:py-2.5 text-[12px] lg:text-[14px] font-bold transition-all whitespace-nowrap"
              style={{ color: mainBj?.streamKey === bj.streamKey ? "#fff" : "rgba(255,255,255,0.4)", borderBottom: mainBj?.streamKey === bj.streamKey ? "2px solid #fff" : "2px solid transparent" }}>
              {bj.nickname}
              {bj.isLive ? <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-red-500/20 text-red-400">ON</span> : <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-white/5 text-white/30">OFF</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* 플레이어 — 모바일 키보드 open 시에도 상단에 작게 유지 */}
        <div className={`flex flex-col min-w-0 lg:flex-1 lg:min-h-0 bg-black shrink-0 lg:shrink ${chatFocused ? "h-[96px] lg:h-auto" : ""}`}>
          {/* 모바일: 16:9 강제 / 데스크탑: 남은 공간 채움 */}
          <div data-player-container className={`relative bg-black w-full ${chatFocused ? "h-full" : "aspect-video"} lg:aspect-auto lg:flex-1 lg:min-h-0`}>
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
                {/* 음소거 해제 오버레이 — 첫 진입 (사용자 오디오 개입 전)에만 표시 */}
                {isMuted && !audioInteracted && (
                  <div onClick={toggleMute}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer select-none"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ border: "4px solid rgba(255,255,255,0.9)" }}>
                      <span className="text-3xl">🔇</span>
                    </div>
                    <p className="text-white text-base lg:text-lg font-bold">탭하여 음소거 해제</p>
                    <p className="text-white/70 text-xs lg:text-sm mt-2">자동재생을 위해 음소거되었습니다</p>
                  </div>
                )}
	                {showVolumeHint && (
	                  <div className="absolute left-1/2 bottom-[66px] -translate-x-1/2 sm:hidden pointer-events-none z-10 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur-md" style={{ background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.18)" }}>
	                    기기 볼륨 버튼으로 음량을 조절하세요
	                  </div>
	                )}
	                {/* 컨트롤: 모바일은 항상 보임, 데스크탑은 hover 시 */}
	                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-2 px-4 py-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
	                  <button onClick={toggleMute} aria-label="음소거" className="text-white/90 hover:text-white text-xl w-10 h-10 flex items-center justify-center">{isMuted ? "🔇" : "🔊"}</button>
                  <input
                    type="range"
                    min={0}
                    max={100}
	                    value={isMuted ? 0 : Math.round(volume * 100)}
	                    onChange={(e) => changeVolume(Number(e.target.value) / 100)}
	                    aria-label="볼륨"
	                    className="hidden sm:block w-28 h-10 accent-white"
	                  />
                  <button onClick={toggleFullscreen} aria-label="전체화면" className="text-white/90 hover:text-white text-xl w-10 h-10 flex items-center justify-center">⛶</button>
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
            <div className={`px-3 lg:px-6 py-2 lg:py-3 ${chatFocused ? "hidden lg:block" : ""}`} style={{ background: "rgba(5,20,40,0.9)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="w-8 h-8 lg:w-11 lg:h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 overflow-hidden">{renderAvatar(mainBj, "w-8 h-8 lg:w-11 lg:h-11")}</div>
                  <div className="min-w-0">
                    <div className="text-[13px] lg:text-[15px] font-bold text-white truncate">{mainBj.title}</div>
                    <div className="text-[11px] lg:text-[12px] text-white/50 truncate mt-0.5">
                      {mainBj.nickname}
                      {mainBj.isLive && liveElapsed && <span className="ml-1.5 text-white/30">⏱ {liveElapsed}</span>}
                      <span className="ml-1.5">
                        👁 {(mainBj.isLive ? (bjViewerCount ?? mainBj.liveViewers) : 0).toLocaleString()}
                        {isAdmin && mainBj.isLive && (() => {
                          // 관리자용 실제값 표시 — 소켓 우선, 없으면 REST의 realViewers 사용
                          const displayed = bjViewerCount ?? mainBj.liveViewers;
                          const real = bjViewerReal ?? mainBj.realViewers ?? mainBj.liveViewers;
                          if (displayed > real) return <span className="ml-1 text-white/40">({real})</span>;
                          return null;
                        })()}
                      </span>
                      {isAdmin && mainBj.isLive && (
                        <span className="ml-1 text-white/30">(누적 {mainBj.viewCount.toLocaleString()})</span>
                      )}
                    </div>
                  </div>
                </div>
                {mainBj.bannerUrl && (
                  <a href={normalizeUrl(mainBj.bannerUrl)} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-[11px] lg:text-[12px] font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                    💬 {mainBj.bannerText || "가입문의"}
                  </a>
                )}
              </div>
              {/* 상태메시지 — 데스크탑만 */}
              {mainBj.statusMessage && (
                <div className="hidden lg:block mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ background: "rgba(110,231,183,0.1)", border: "1px solid rgba(110,231,183,0.2)", color: "rgba(110,231,183,0.8)" }}>
                  📢 {mainBj.statusMessage}
                </div>
              )}
            </div>
          )}

          {/* BJ 설명 — 데스크탑만 */}
          {mainBj?.description && (
            <div className="hidden lg:block px-4 lg:px-6 py-2 text-[12px] text-white/40" style={{ background: "rgba(5,20,40,0.5)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{mainBj.description}</div>
          )}

          {/* 다른 방송 — 데스크탑만 */}
          {otherLiveBjs.length > 0 && (
            <div className="hidden lg:block px-4 py-3" style={{ background: "rgba(5,20,40,0.6)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
        <div className="w-full lg:w-[368px] flex flex-col flex-1 lg:flex-none lg:h-auto min-h-0" style={{ background: "rgba(5,20,40,0.95)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
          {/* 헤더: LIVE CHAT 라벨은 데스크탑만 / 관리모드 뱃지는 항상 */}
          <div className="hidden lg:flex items-center justify-between px-3 py-2 shrink-0 relative" style={{ background: "rgba(0,0,0,0.15)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ border: "1px solid rgba(110,231,183,0.25)", background: "rgba(110,231,183,0.1)", color: "rgb(110,231,183)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgb(110,231,183)" }} />
              LIVE CHAT
            </span>
            <div className="flex items-center gap-1.5">
              {isAdmin && (
                <button onClick={() => setShowOnlineList(v => !v)}
                  title="접속자 목록"
                  className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ background: showOnlineList ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.15)", color: "#93c5fd" }}>
                  👥 {onlineList.count}
                </button>
              )}
              {canModerate && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.2)", color: "#6ee7b7" }}>관리모드</span>}
            </div>
            {isAdmin && showOnlineList && (
              <OnlineListPanel onlineList={onlineList} bjId={mainBjId ?? null} onClose={() => setShowOnlineList(false)} />
            )}
          </div>
          {canModerate && <div className="lg:hidden flex items-center justify-end gap-1.5 px-2 py-1 shrink-0 relative" style={{ background: "rgba(0,0,0,0.15)" }}>
            {isAdmin && (
              <button onClick={() => setShowOnlineList(v => !v)}
                className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: showOnlineList ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.15)", color: "#93c5fd" }}>
                👥 {onlineList.count}
              </button>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.2)", color: "#6ee7b7" }}>관리모드</span>
            {isAdmin && showOnlineList && (
              <OnlineListPanel onlineList={onlineList} bjId={mainBjId ?? null} onClose={() => setShowOnlineList(false)} />
            )}
          </div>}

          {/* 채팅 상단 가입문의 배너 — 데스크탑만 (모바일은 위 BJ 프로필에 동일 버튼) */}
          {chatSettings?.bannerUrl && (
            <a href={normalizeUrl(chatSettings.bannerUrl)} target="_blank" rel="noopener noreferrer"
              className="hidden lg:block mx-3 mt-2 px-4 py-2.5 rounded-lg text-center text-[13px] font-bold transition-all hover:opacity-90"
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
              chatLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-white/40">
                  <span className="inline-block w-3 h-3 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "rgba(255,255,255,0.5)" }} />
                  <span>채팅 불러오는 중...</span>
                </div>
              ) : (
                <div className="text-center text-[12px] text-white/25 italic py-4">아직 채팅이 없습니다.</div>
              )
            )}
            {chatMessages.map(msg => {
              // 입/퇴장 알림 — mod-only 수신 (서버에서 권한 분리되어 emit)
              if (msg.isPresence) {
                return (
                  <div key={msg.id} className="mb-1 px-2 py-0.5 text-[10px] text-center italic" style={{ color: "rgba(156,163,175,0.7)" }}>
                    {msg.text}
                  </div>
                );
              }
              if (isSystemMsg(msg)) {
                return (
                  <div key={msg.id} className="mb-2 px-3 py-1.5 rounded text-[11px] font-medium text-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "rgba(253,224,71,0.9)" }}>
                    ⚡ {msg.text}
                  </div>
                );
              }
              const rs = ROLE_STYLE[msg.role];
              const isHovered = hoveredMsg === msg.id;
              // 관리자/픽스터/BJ는 레벨 뱃지 숨김 — 역할 뱃지만 노출
              const isPrivilegedRole = ["ADMIN", "SUPERADMIN", "PICKSTER", "BJ"].includes(msg.role);
              const isMsgManager = !isPrivilegedRole && !!msg.userId && managerIds.has(msg.userId);
              const isGuestMsg = !msg.userId && !!msg.guestId;
              return (
                <div key={msg.id} className="relative mb-1.5 rounded -mx-1 px-1 py-0.5"
                  onMouseEnter={() => canModerate ? setHoveredMsg(msg.id) : undefined}
                  onMouseLeave={() => setHoveredMsg(null)}
                  style={{ background: canModerate && isHovered ? "rgba(255,255,255,0.05)" : "transparent" }}>
                  {/* 텍스트는 항상 자연스러운 폭으로 렌더 (좌측 쏠림 방지) — 버튼은 hover 시 absolute 로 텍스트 위에 overlay */}
                  <div className="text-[13px] leading-relaxed break-words" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {/* 일반 유저만 레벨 뱃지 (매니저/관리자/픽스터/BJ/비회원은 숨김) */}
                    {!isPrivilegedRole && !isMsgManager && !isGuestMsg && levelDisplayMode !== "none" && typeof msg.level === "number" && (
                      <LevelBadge level={msg.level} mode={levelDisplayMode as "badge" | "emoji" | "none"} />
                    )}
                    {/* 매니저 표기 (스패너) */}
                    {isMsgManager && (
                      <span className="inline-flex items-center justify-center px-1 py-0.5 rounded text-[10px] mr-1" title="매니저"
                        style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>
                        <i className="fas fa-wrench" />
                      </span>
                    )}
                    {isGuestMsg && (
                      <span className="inline-block px-1 py-0.5 rounded text-[9px] mr-1" style={{ background: "rgba(156,163,175,0.2)", color: "#9ca3af" }}>손님</span>
                    )}
                    {rs && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white mr-1" style={{ background: rs.bg }}>{rs.label}</span>}
                    <span className="font-bold" style={{ color: rs?.bg || (isGuestMsg ? "#9ca3af" : "#60a5fa") }}>{msg.nickname} : </span>
                    <span>{msg.text}</span>
                  </div>
                  {/* hover 시 오른쪽 버튼 — absolute 로 띄워 텍스트 흐름 영향 없음 */}
                  {canModerate && isHovered && (
                    <div className="absolute right-1 top-0.5 flex items-center gap-0.5 px-0.5 rounded shadow"
                      style={{ background: "rgba(5,20,40,0.92)" }}>
                      <button onClick={() => pinMessage(msg.id, true)} title="고정"
                        className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-blue-500/30" style={{ color: "#60a5fa" }}>📌</button>
                      <button onClick={() => deleteMessage(msg.id)} title="삭제"
                        className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-red-500/30" style={{ color: "#f87171" }}>✕</button>
                      {msg.userId && (
                        <button onClick={() => banUser(msg.userId!, msg.nickname)} title="차단"
                          className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-orange-500/30" style={{ color: "#fbbf24" }}>🚫</button>
                      )}
                      {isGuestMsg && (
                        <button onClick={() => banGuest(msg.guestId!, msg.nickname)} title="비회원 차단"
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
            {isBanned ? (
              <div className="text-center text-[13px] py-1" style={{ color: "rgba(239,68,68,0.7)" }}>채팅이 차단되었습니다.</div>
            ) : (
              <>
                {!user && guest && (
                  <div className="text-[10px] mb-1.5 flex items-center justify-between" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span>비회원: <span className="font-bold" style={{ color: "#9ca3af" }}>{guest.name}</span></span>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("open-login-modal"))}
                      className="text-sky-400 hover:underline font-bold text-[10px]"
                    >로그인</button>
                  </div>
                )}
                <div className="flex gap-1.5">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder={user ? "채팅 입력..." : "비회원으로 채팅..."} maxLength={100}
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                    onFocus={() => {
                      setChatFocused(true);
                      // 입력 시 채팅 마지막 메시지 보이게
                      setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 100);
                    }}
                    onBlur={() => setChatFocused(false)}
                    className="flex-1 rounded-lg px-3 py-2 text-[16px] lg:text-[14px] focus:outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                  <button onMouseDown={(e) => e.preventDefault()} onClick={sendMessage} className="px-4 py-2 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>전송</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 관리자용 — 헤더 아래 드롭다운으로 표시되는 작은 접속자 목록 패널
function OnlineListPanel({ onlineList, bjId, onClose }: {
  onlineList: { members: { nickname: string }[]; guests: { nickname: string }[]; count: number };
  bjId: number | null;
  onClose: () => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const refresh = () => {
    if (!bjId) return;
    setSpinning(true);
    getSocket().emit("admin:online-users:refresh", { bjId });
    setTimeout(() => setSpinning(false), 500);
  };
  return (
    <div className="absolute right-2 top-full mt-1 z-30 w-[180px] rounded-lg shadow-xl"
      style={{ background: "rgba(15,30,55,0.98)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>접속자 {onlineList.count}명</span>
        <div className="flex items-center gap-1">
          <button onClick={refresh} title="새로고침" className={`text-[11px] ${spinning ? "animate-spin" : ""}`} style={{ color: "rgba(147,197,253,0.85)" }}>↻</button>
          <button onClick={onClose} className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>✕</button>
        </div>
      </div>
      <div className="max-h-[220px] overflow-y-auto px-2 py-1.5 text-[11px] space-y-0.5">
        {onlineList.members.length === 0 && onlineList.guests.length === 0 && (
          <div className="text-center py-2" style={{ color: "rgba(255,255,255,0.35)" }}>접속자가 없습니다.</div>
        )}
        {onlineList.members.map((m, i) => (
          <div key={`m-${i}`} className="flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#22c55e" }} />
            <span className="truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{m.nickname}</span>
          </div>
        ))}
        {onlineList.guests.map((g, i) => (
          <div key={`g-${i}`} className="flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#9ca3af" }} />
            <span className="truncate" style={{ color: "rgba(156,163,175,0.85)" }}>{g.nickname}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
