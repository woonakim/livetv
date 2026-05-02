"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket";

const MENU_ITEMS = [
  { svgIcon: "/svg_logo/icon-svg-01.svg", label: "스폰업체",  href: "/partners" },
  { svgIcon: "/svg_logo/icon-svg-02.svg", label: "스포츠중계", href: "/broadcast" },
  { svgIcon: "/svg_logo/icon-svg-04.svg", label: "스포츠분석", href: "/analysis/premium" },
  { svgIcon: "/svg_logo/icon-svg-03.svg", label: "스포츠정보", href: "/sports-info/standings" },
  { svgIcon: "/svg_logo/icon-svg-09.svg", label: "유튜브",    href: "/youtube/highlights" },
  { svgIcon: "/svg_logo/icon-svg-08.svg", label: "이벤트",    href: "/events" },
  { svgIcon: "/svg_logo/icon-svg-06.svg", label: "포인트전환", href: "/points" },
  { svgIcon: "/svg_logo/icon-svg-05.svg", label: "스코어정보", href: "/sports-info/standings" },
  { svgIcon: "/svg_logo/icon-svg-10.svg", label: "공지사항",  href: "/notice" },
  { svgIcon: "/svg_logo/icon-svg-11.svg", label: "메인으로",  href: "/" },
];

interface ChatMsg {
  id: number;
  nickname: string;
  role: string;
  text: string;
  createdAt: string;
}

interface Props {
  user?: { id: number; nickname: string; role: string; points?: number } | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export default function FloatingPanel({ user, onLogout, onOpenLogin, onOpenRegister }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMsg[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatViewerCount, setChatViewerCount] = useState(0);
  const [chatViewerReal, setChatViewerReal] = useState(0);
  const chatMsgRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatMsgRef.current) chatMsgRef.current.scrollTop = chatMsgRef.current.scrollHeight;
    }, 50);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    let loaded = false;

    socket.on("chat:init", (data: ChatMsg[]) => {
      setChatMessages(data);
      setChatLoaded(true);
      scrollToBottom();
      loaded = true;
    });

    socket.on("chat:message", (msg: ChatMsg) => {
      setChatMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      scrollToBottom();
    });

    socket.on("online:count", (count: number) => {
      setOnlineCount(count);
    });

    socket.on("viewer:chat", (data: { count: number; real: number }) => {
      setChatViewerCount(data.count);
      setChatViewerReal(data.real);
    });

    socket.on("chat:deleted", (msgId: number) => {
      setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
    });

    socket.on("chat:pinned", (pinned: ChatMsg[]) => {
      setPinnedMessages(pinned);
    });

    // 이미 연결된 상태면 chat:init을 못 받을 수 있음 → REST fallback
    const fallbackTimer = setTimeout(() => {
      if (!loaded) {
        fetch("/api/chat").then(r => r.json()).then(data => {
          if (!loaded) {
            setChatMessages(data.messages || []);
            setPinnedMessages(data.pinned || []);
            setChatLoaded(true);
            scrollToBottom();
            loaded = true;
          }
        }).catch(() => { setChatLoaded(true); });
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      socket.off("chat:init");
      socket.off("chat:message");
      socket.off("online:count");
      socket.off("viewer:chat");
      socket.off("chat:deleted");
      socket.off("chat:pinned");
    };
  }, [scrollToBottom]);

  const openMenu = () => { setChatOpen(false); setMenuOpen(true); };
  const openChat = () => { setMenuOpen(false); setChatOpen(true); };
  const closeAll = () => { setMenuOpen(false); setChatOpen(false); };

  const sendMessage = () => {
    if (!chatInput.trim() || sending) return;
    if (!user) { onOpenLogin(); return; }
    const socket = getSocket();
    socket.emit("chat:send", {
      userId: user.id,
      nickname: user.nickname,
      role: user.role,
      text: chatInput.trim(),
    });
    setChatInput("");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* 블러 오버레이 (메뉴만) */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/40"
          style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={closeAll}
        />
      )}

      {/* ── 메뉴 패널 ── */}
      <div
        className="lg:hidden fixed left-0 right-0 z-[70] rounded-t-2xl overflow-hidden"
        style={{
          bottom: 0, height: "45vh", maxHeight: 440,
          transform: menuOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
          background: "var(--surface)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>

        <div className="overflow-y-auto h-[calc(100%-24px)] px-4 pb-6" style={{ scrollbarWidth: "none" }}>
          {/* 회원정보 */}
          <div className="mb-4">
            <p className="text-[13px] font-bold py-2" style={{ color: "var(--text-primary)" }}>회원 정보</p>
            {user ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ background: "var(--brand)" }}>
                    {user.nickname[0]}
                  </div>
                  <div>
                    <a href="/mypage" onClick={closeAll} className="text-[13px] font-bold hover:underline" style={{ color: "var(--text-primary)" }}>{user.nickname}</a>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{(user.points ?? 0).toLocaleString()} P</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <a href="/mypage" onClick={closeAll} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--brand)", color: "#fff" }}>마이</a>
                  {(user.role === "ADMIN" || user.role === "SUPERADMIN") && (
                    <a href="/admin" className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "#dc2626" }}>관리</a>
                  )}
                  <button
                    onClick={() => { closeAll(); onLogout(); }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
                    style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >로그아웃</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { closeAll(); onOpenLogin(); }} className="h-11 rounded-xl font-bold text-[14px] text-white" style={{ background: "var(--brand)" }}>로그인</button>
                <button onClick={() => { closeAll(); onOpenRegister(); }} className="h-11 rounded-xl font-bold text-[14px]" style={{ border: "1.5px solid var(--brand)", color: "var(--brand)", background: "transparent" }}>회원가입</button>
              </div>
            )}
          </div>

          {/* 전체서비스 */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>전체서비스</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const shareData = { title: document.title, url: window.location.href };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch {}
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    alert("링크가 복사되었습니다!");
                  }
                }}
                className="text-[11px] font-semibold text-white px-3 h-7 rounded-lg flex items-center gap-1"
                style={{ background: "var(--brand)" }}
              >
                공유하기 <i className="fas fa-share-alt text-[10px]" />
              </button>
            </div>
          </div>

          {/* 아이콘 그리드 */}
          <ul className="grid grid-cols-5 gap-2 mb-4">
            {MENU_ITEMS.map((item) => (
              <li key={item.href + item.label}>
                <Link href={item.href} onClick={closeAll}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 w-full"
                  style={{ background: "var(--bg)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.svgIcon} alt="" className="w-8 h-8 object-contain" />
                  <p className="text-[9px] font-semibold text-center leading-tight" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 채팅 패널 ── */}
      <div
        className="lg:hidden fixed left-0 right-0 z-[70] rounded-t-2xl flex flex-col"
        style={{
          bottom: 0, height: "45vh", maxHeight: 440,
          transform: chatOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
          background: "var(--surface)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>

        {/* 채팅 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="live-dot w-1.5 h-1.5 rounded-full inline-block bg-red-500" />
            <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>라이브 공개채팅</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              👥 {(chatViewerCount || onlineCount).toLocaleString()}
              {user && (user.role === "ADMIN" || user.role === "SUPERADMIN") && chatViewerCount > chatViewerReal && (
                <span className="ml-1 opacity-60">({chatViewerReal})</span>
              )}
            </span>
            <button onClick={closeAll} className="w-8 h-8 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
              <i className="fas fa-times text-[14px]" />
            </button>
          </div>
        </div>

        {/* 고정 메시지 */}
        {pinnedMessages.length > 0 && (
          <div className="px-3 py-1.5 space-y-1 flex-shrink-0" style={{ background: "var(--brand)", borderBottom: "1px solid var(--border)" }}>
            {pinnedMessages.map((pm) => (
              <div key={pm.id} className="flex items-center gap-1.5 text-[10px]">
                <span className="shrink-0">📌</span>
                <span className="font-bold text-white">{pm.nickname}</span>
                <span className="text-white/90 truncate flex-1">{pm.text}</span>
                {(user?.role === "ADMIN" || user?.role === "SUPERADMIN") && (
                  <button
                    onClick={() => { const socket = getSocket(); socket.emit("chat:pin", { msgId: pm.id, pin: false, role: user.role }); }}
                    className="text-white/60 hover:text-white text-[9px] shrink-0"
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 메시지 목록 */}
        <div ref={chatMsgRef} className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar" style={{ background: "var(--bg)" }}>
          {!chatLoaded && (
            <div className="flex flex-col items-center justify-center mt-8 gap-2">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }} />
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>채팅을 불러오는 중...</p>
            </div>
          )}
          {chatLoaded && chatMessages.length === 0 && (
            <p className="text-center text-[11px] mt-4" style={{ color: "var(--text-secondary)" }}>첫 번째 채팅을 남겨보세요!</p>
          )}
          {chatMessages.map((msg) => (
            <div key={msg.id} className="text-xs relative">
              <div className="flex items-center gap-1 mb-0.5">
                {msg.role === "ADMIN" || msg.role === "SUPERADMIN" ? (
                  <><span className="text-[8px] font-bold px-1 py-0.5 rounded text-white" style={{ background: "#dc2626" }}>관리자</span><span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "#dc2626", background: "#fef2f2" }}>{msg.nickname}</span></>
                ) : msg.role === "PICKSTER" ? (
                  <><span className="text-[8px] font-bold px-1 py-0.5 rounded text-white" style={{ background: "#3b82f6" }}>픽스터</span><span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "#3b82f6", background: "#eff6ff" }}>{msg.nickname}</span></>
                ) : msg.role === "BJ" ? (
                  <><span className="text-[8px] font-bold px-1 py-0.5 rounded text-white" style={{ background: "#a855f7" }}>BJ</span><span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "#a855f7", background: "rgba(168,85,247,0.1)" }}>{msg.nickname}</span></>
                ) : (
                  <span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "var(--brand)", background: "var(--brand-light)" }}>{msg.nickname}</span>
                )}
                <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>{formatTime(msg.createdAt)}</span>
                {(user?.role === "ADMIN" || user?.role === "SUPERADMIN") && (
                  <span className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => { const socket = getSocket(); socket.emit("chat:pin", { msgId: msg.id, pin: true, role: user.role }); }}
                      className="text-[9px] text-yellow-500 px-1"
                    >📌</button>
                    <button
                      onClick={() => { const socket = getSocket(); socket.emit("chat:delete", { msgId: msg.id, role: user.role }); }}
                      className="text-[9px] text-red-400 px-1"
                    >X</button>
                  </span>
                )}
              </div>
              <p className="pl-1 leading-relaxed" style={{ color: "var(--text-primary)" }}>{msg.text}</p>
            </div>
          ))}
        </div>

        {/* 입력창 */}
        <div className="flex-shrink-0 p-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex gap-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={user ? "채팅 입력..." : "로그인 후 채팅 가능"}
              className="flex-1 rounded-md px-2 py-1.5 text-[16px] focus:outline-none min-w-0"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              maxLength={100}
              readOnly={!user}
            />
            <button
              onClick={user ? sendMessage : onOpenLogin}
              disabled={sending}
              className="text-white text-xs px-3 py-1.5 rounded-md font-bold shrink-0"
              style={{ background: "var(--brand)", opacity: sending ? 0.6 : 1 }}
            >
              {sending ? "..." : "전송"}
            </button>
          </div>
          {!user && (
            <p className="text-[9px] mt-1" style={{ color: "var(--text-secondary)" }}>* 로그인 후 채팅 가능</p>
          )}
        </div>
      </div>

      {/* ── 플로팅 캡슐 버튼 ── */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed", bottom: "72px", right: "16px", zIndex: 200,
          opacity: menuOpen || chatOpen ? 0 : 1,
          pointerEvents: menuOpen || chatOpen ? "none" : "auto",
          transition: "opacity 0.2s ease",
        }}
      >
        <div style={{
          width: 52, height: 110, borderRadius: 999,
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 0 8px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.6)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "space-around", padding: "6px 0",
        }}>
          <button onClick={openMenu} style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }}>
            <i className="fas fa-bars" style={{ fontSize: 20, color: "var(--brand)" }} />
          </button>
          <div style={{ width: 28, height: 1, background: "var(--border)" }} />
          <button onClick={openChat} style={{ position: "relative", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }}>
            <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#22c55e", border: "1.5px solid white" }} />
            <i className="fas fa-comment-dots" style={{ fontSize: 18, color: "var(--brand)" }} />
          </button>
        </div>
      </div>
    </>
  );
}
