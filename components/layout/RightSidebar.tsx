"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { getGrade, getExpProgress } from "@/lib/grade";
import { getSocket } from "@/lib/socket";
import LevelBadge from "@/components/ui/LevelBadge";
import SidebarBanners from "@/components/ui/SidebarBanners";

interface Props {
  user?: { id: number; nickname: string; role: string; points?: number; exp?: number; referredBy?: string | null } | null;
  authReady?: boolean;
  onLoginSuccess?: () => void;
  onOpenRegister?: () => void;
  onLogout?: () => void;
}

interface ChatMsg {
  id: number;
  nickname: string;
  role: string;
  level: number;
  text: string;
  isPinned?: boolean;
  createdAt: string;
}

export default function RightSidebar({ user, authReady, onLoginSuccess, onOpenRegister, onLogout }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMsg[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleSidebarLogin = async () => {
    if (!loginForm.username || !loginForm.password) return;
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error); return; }
      onLoginSuccess?.();
    } catch {
      setLoginError("서버 오류가 발생했습니다.");
    } finally {
      setLoginLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 50);
  };

  useEffect(() => {
    const socket = getSocket();
    let loaded = false;

    socket.on("chat:init", (data: ChatMsg[]) => {
      loaded = true;
      setMessages(data);
      setChatLoaded(true);
      scrollToBottom();
    });

    socket.on("chat:message", (msg: ChatMsg) => {
      if (!loaded) { loaded = true; setChatLoaded(true); }
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      scrollToBottom();
    });

    socket.on("online:count", (count: number) => {
      setOnlineCount(count);
    });

    socket.on("chat:deleted", (msgId: number) => {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    });

    socket.on("chat:pinned", (pinned: ChatMsg[]) => {
      setPinnedMessages(pinned);
    });

    // 이미 연결된 상태면 chat:init을 못 받을 수 있음 → REST fallback
    const fallbackTimer = setTimeout(() => {
      if (!loaded) {
        fetch("/api/chat").then(r => r.json()).then(data => {
          if (!loaded) {
            setMessages(data.messages || []);
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
      socket.off("chat:deleted");
      socket.off("chat:pinned");
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || sending || !user) return;
    setSending(true);
    const socket = getSocket();
    socket.emit("chat:send", {
      userId: user.id,
      nickname: user.nickname,
      role: user.role,
      text: input.trim(),
    });
    setInput("");
    setSending(false);
  };

  return (
    <aside className="flex flex-col gap-2 shrink-0" style={{ width: "var(--sidebar-width)" }}>

      {/* 상단 배너 (DB 관리) */}
      <SidebarBanners position="right_top" />

      {/* 로그인 위젯 */}
      <div
        className="rounded-lg p-3 shadow-card"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {!authReady ? (
          <div className="h-[90px]" />
        ) : user ? (
          /* 로그인 상태 */
          (() => {
            const exp = user.exp ?? 0;
            const grade = getGrade(exp);
            const progress = getExpProgress(exp);
            return (
              <div className="flex flex-col gap-2.5">
                {/* 닉네임 + 등급 + 로그아웃 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{grade.icon}</span>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{user.nickname}</span>
                        {user.role === "ADMIN" && (
                          <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: "var(--brand)", color: "#fff" }}>관리자</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: grade.color }}>{grade.name}</span>
                    </div>
                  </div>
                  <button onClick={onLogout} className="text-[11px] font-bold px-2 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    로그아웃
                  </button>
                </div>

                {/* 경험치 바 */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-secondary)" }}>
                    <span>경험치</span>
                    <span style={{ color: grade.color }}>
                      {progress.needed > 0 ? `${progress.current} / ${progress.needed}` : "MAX"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress.percent}%`, background: grade.color }} />
                  </div>
                </div>

                {/* 포인트 */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>보유 포인트</span>
                  <span className="text-sm font-black" style={{ color: "var(--brand)" }}>{(user.points ?? 0).toLocaleString()} P</span>
                </div>

                {/* 추천인 */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>추천인</span>
                  <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
                    {user.referredBy || <span style={{ color: "var(--text-secondary)" }}>없음</span>}
                  </span>
                </div>

                <Link href="/points" className="w-full py-1.5 rounded text-center text-xs font-bold" style={{ background: "var(--brand)", color: "#fff" }}>
                  포인트 전환
                </Link>
              </div>
            );
          })()
        ) : (
          /* 비로그인 상태 */
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>로그인</div>
            <div className="flex gap-1 h-[74px]">
              <div className="flex flex-col flex-grow">
                <input
                  type="text"
                  placeholder="아이디"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(f => ({ ...f, username: e.target.value }))}
                  className="flex-1 px-2 text-xs focus:outline-none rounded-t-lg"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleSidebarLogin()}
                />
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  className="flex-1 px-2 text-xs focus:outline-none rounded-b-lg"
                  style={{ border: "1px solid var(--border)", borderTop: "none", background: "var(--bg)", color: "var(--text-primary)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleSidebarLogin()}
                />
              </div>
              <button
                onClick={handleSidebarLogin}
                disabled={loginLoading}
                className="w-20 font-bold text-white rounded-lg text-sm"
                style={{ background: "var(--brand)", opacity: loginLoading ? 0.7 : 1 }}
              >
                {loginLoading ? "..." : "로그인"}
              </button>
            </div>
            {loginError && <p className="text-[10px] text-red-400">{loginError}</p>}
            <div className="flex gap-4 text-[11px] ml-1" style={{ color: "var(--text-secondary)" }}>
              <span className="cursor-pointer hover:underline" onClick={onOpenRegister}>회원가입</span>
            </div>
          </div>
        )}
      </div>

      {/* 라이브 채팅 (실시간 안내사항) */}
      <div
        className="rounded-lg overflow-hidden shadow-card"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="live-dot w-1.5 h-1.5 rounded-full inline-block bg-red-500" />
            <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>라이브 공개채팅</span>
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>👥 {onlineCount.toLocaleString()}</span>
        </div>

        {pinnedMessages.length > 0 && (
          <div className="px-2 py-1.5 space-y-1" style={{ background: "var(--brand)", borderBottom: "1px solid var(--border)" }}>
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

        <div ref={chatRef} className="h-[340px] overflow-y-auto custom-scrollbar p-2 space-y-2" style={{ background: "var(--bg)" }}>
          {!chatLoaded && (
            <div className="flex flex-col items-center justify-center mt-8 gap-2">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }} />
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>채팅을 불러오는 중...</p>
            </div>
          )}
          {chatLoaded && messages.length === 0 && (
            <p className="text-center text-[11px] mt-4" style={{ color: "var(--text-secondary)" }}>첫 번째 채팅을 남겨보세요!</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="text-xs group relative">
              <div className="flex items-center gap-1 mb-0.5">
                <LevelBadge level={msg.level || 0} />
                {msg.role === "ADMIN" || msg.role === "SUPERADMIN" ? (
                  <><span className="text-[8px] font-bold px-1 py-0.5 rounded text-white" style={{ background: "#dc2626" }}>관리자</span><span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "#dc2626", background: "#fef2f2" }}>{msg.nickname}</span></>
                ) : msg.role === "PICKSTER" ? (
                  <><span className="text-[8px] font-bold px-1 py-0.5 rounded text-white" style={{ background: "#3b82f6" }}>픽스터</span><span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "#3b82f6", background: "#eff6ff" }}>{msg.nickname}</span></>
                ) : msg.role === "BJ" ? (
                  <><span className="text-[8px] font-bold px-1 py-0.5 rounded text-white" style={{ background: "#9333ea" }}>BJ</span><span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "#9333ea", background: "#f3e8ff" }}>{msg.nickname}</span></>
                ) : (
                  <span className="font-bold text-[10px] px-1 py-0.5 rounded" style={{ color: "#2563eb", background: "#eff6ff" }}>{msg.nickname}</span>
                )}
                <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                  {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {(user?.role === "ADMIN" || user?.role === "SUPERADMIN") && (
                  <span className="hidden group-hover:inline-flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => { const socket = getSocket(); socket.emit("chat:pin", { msgId: msg.id, pin: !msg.isPinned, role: user.role }); }}
                      className="text-[9px] text-yellow-500 hover:text-yellow-600"
                    >{msg.isPinned ? "📌해제" : "📌고정"}</button>
                    <button
                      onClick={() => { const socket = getSocket(); socket.emit("chat:delete", { msgId: msg.id, role: user.role }); }}
                      className="text-[9px] text-red-400 hover:text-red-600"
                    >삭제</button>
                  </span>
                )}
              </div>
              <p className="pl-1 leading-relaxed" style={{ color: "var(--text-primary)" }}>{msg.text}</p>
            </div>
          ))}
        </div>

        <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex gap-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={user ? "채팅 입력..." : "로그인 후 채팅 가능"}
              className="flex-1 rounded-md px-2 py-1.5 text-[16px] focus:outline-none min-w-0"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              maxLength={100}
              readOnly={!user}
            />
            <button
              onClick={sendMessage}
              disabled={sending}
              className="text-white text-xs px-3 py-1.5 rounded-md font-bold shrink-0"
              style={{ background: "var(--brand)", opacity: sending ? 0.6 : 1 }}
            >
              {sending ? "..." : "전송"}
            </button>
          </div>
          {!user && <p className="text-[9px] mt-1" style={{ color: "var(--text-secondary)" }}>* 로그인 후 채팅 가능</p>}
        </div>
      </div>

      {/* BIG 이벤트 */}
      <div className="flex flex-col gap-1">
        <div
          className="rounded p-1 flex items-center justify-between px-3 h-10 shadow-sm"
          style={{ background: "var(--surface)" }}
        >
          <div className="text-sm font-bold" style={{ color: "var(--brand)" }}>BIG 이벤트</div>
          <Link href="/attendance" className="text-[10px] font-bold underline" style={{ color: "var(--text-secondary)" }}>더보기 +</Link>
        </div>
        <Link href="/attendance" className="rounded-lg overflow-hidden block shadow-card hover:opacity-90 transition-opacity">
          <img src="/cscheck.png" alt="출석체크 이벤트" className="w-full h-auto" />
        </Link>
      </div>

      {/* 하단 배너 (DB 관리) */}
      <SidebarBanners position="right_bottom" />

    </aside>
  );
}
