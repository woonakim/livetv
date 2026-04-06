"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Tab = "login" | "register";

interface Props {
  defaultTab?: Tab;
  onClose: () => void;
  onSuccess: (user: { nickname: string; role: string }) => void;
}

interface CheckState {
  status: "idle" | "checking" | "ok" | "error";
  message: string;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AuthModal({ defaultTab = "login", onClose, onSuccess }: Props) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>(defaultTab);

  // ── 로그인 ──
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── 회원가입 ──
  const [regForm, setRegForm] = useState({
    username: "", password: "", passwordConfirm: "",
    nickname: "", name: "", phone: "", email: "", referredBy: "",
  });
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [setting, setSetting] = useState({ requireName: false, requirePhone: false, requireEmail: false });
  const [usernameCheck, setUsernameCheck] = useState<CheckState>({ status: "idle", message: "" });
  const [nicknameCheck, setNicknameCheck] = useState<CheckState>({ status: "idle", message: "" });

  const debouncedUsername = useDebounce(regForm.username, 500);
  const debouncedNickname = useDebounce(regForm.nickname, 500);

  useEffect(() => {
    fetch("/api/admin/registration-setting").then(r => r.json()).then(d => {
      if (d.setting) setSetting(d.setting);
    }).catch(() => {});
  }, []);

  // 아이디 중복 체크
  useEffect(() => {
    if (debouncedUsername.length < 4) {
      setUsernameCheck({ status: "idle", message: "" });
      return;
    }
    setUsernameCheck({ status: "checking", message: "" });
    fetch(`/api/auth/check-username?username=${encodeURIComponent(debouncedUsername)}`)
      .then(r => r.json())
      .then(d => setUsernameCheck({ status: d.available ? "ok" : "error", message: d.message }));
  }, [debouncedUsername]);

  // 닉네임 중복 체크
  useEffect(() => {
    if (debouncedNickname.length < 2) {
      setNicknameCheck({ status: "idle", message: "" });
      return;
    }
    setNicknameCheck({ status: "checking", message: "" });
    fetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(debouncedNickname)}`)
      .then(r => r.json())
      .then(d => setNicknameCheck({ status: d.available ? "ok" : "error", message: d.message }));
  }, [debouncedNickname]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      onSuccess({ nickname: data.nickname, role: data.role });
      onClose();
      router.refresh();
    } catch {
      setLoginError("서버 오류가 발생했습니다.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (usernameCheck.status !== "ok") { setRegError("아이디 중복 확인을 해주세요."); return; }
    if (nicknameCheck.status !== "ok") { setRegError("닉네임 중복 확인을 해주세요."); return; }
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.error); return; }
      onSuccess({ nickname: data.nickname, role: "USER" });
      onClose();
      router.refresh();
    } catch {
      setRegError("서버 오류가 발생했습니다.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inputBase = "w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]";
  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  const CheckIcon = ({ state }: { state: CheckState }) => {
    if (state.status === "idle") return null;
    if (state.status === "checking") return <span className="text-xs" style={{ color: "var(--text-secondary)" }}>확인중...</span>;
    return <span className={`text-xs font-bold ${state.status === "ok" ? "text-green-500" : "text-red-400"}`}>{state.message}</span>;
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
    >
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* 탭 헤더 */}
        <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["login", "register"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-3.5 text-sm font-bold transition-colors"
              style={{
                color: tab === t ? "var(--brand)" : "var(--text-secondary)",
                borderBottom: tab === t ? "2px solid var(--brand)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {t === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
          <button onClick={onClose} className="px-4 text-lg" style={{ color: "var(--text-secondary)" }}>✕</button>
        </div>

        <div className="p-5">
          {/* ── 로그인 탭 ── */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
              <input className={inputBase} style={inputStyle} placeholder="아이디" value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} autoComplete="username" />
              <input className={inputBase} style={inputStyle} type="password" placeholder="비밀번호" value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} autoComplete="current-password" />
              {loginError && <p className="text-xs text-red-400 text-center">{loginError}</p>}
              <button type="submit" disabled={loginLoading}
                className="mt-1 w-full py-2.5 rounded-lg font-bold text-sm text-white"
                style={{ background: "var(--brand)", opacity: loginLoading ? 0.7 : 1 }}>
                {loginLoading ? "처리 중..." : "로그인"}
              </button>
              <p className="text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                계정이 없으신가요?{" "}
                <button type="button" onClick={() => setTab("register")} className="font-bold" style={{ color: "var(--brand)" }}>
                  회원가입
                </button>
              </p>
            </form>
          )}

          {/* ── 회원가입 탭 ── */}
          {tab === "register" && (
            <form onSubmit={handleRegSubmit} className="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* 아이디 */}
              <div>
                <input className={inputBase} style={inputStyle} placeholder="아이디 (4~12자)" value={regForm.username}
                  onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))} autoComplete="username" maxLength={12} />
                <div className="mt-1 ml-1"><CheckIcon state={usernameCheck} /></div>
              </div>

              {/* 비밀번호 */}
              <input className={inputBase} style={inputStyle} type="password" placeholder="비밀번호 (6자 이상)" value={regForm.password}
                onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
              <input className={inputBase} style={inputStyle} type="password" placeholder="비밀번호 확인" value={regForm.passwordConfirm}
                onChange={e => setRegForm(f => ({ ...f, passwordConfirm: e.target.value }))} autoComplete="new-password" />

              {/* 닉네임 */}
              <div>
                <input className={inputBase} style={inputStyle} placeholder="닉네임 (2~8자)" value={regForm.nickname}
                  onChange={e => setRegForm(f => ({ ...f, nickname: e.target.value }))} maxLength={8} />
                <div className="mt-1 ml-1"><CheckIcon state={nicknameCheck} /></div>
              </div>

              {/* 관리자 설정 선택 필드 */}
              {setting.requireName && (
                <input className={inputBase} style={inputStyle} placeholder="이름" value={regForm.name}
                  onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} />
              )}
              {setting.requirePhone && (
                <input className={inputBase} style={inputStyle} placeholder="전화번호" value={regForm.phone}
                  onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} />
              )}
              {setting.requireEmail && (
                <input className={inputBase} style={inputStyle} type="email" placeholder="이메일" value={regForm.email}
                  onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} />
              )}

              {/* 추천인 (항상 선택사항) */}
              <input className={inputBase} style={{ ...inputStyle, borderStyle: "dashed" }} placeholder="추천인 아이디 (선택사항)" value={regForm.referredBy}
                onChange={e => setRegForm(f => ({ ...f, referredBy: e.target.value }))} />

              {regError && <p className="text-xs text-red-400 text-center">{regError}</p>}

              <button type="submit" disabled={regLoading}
                className="mt-1 w-full py-2.5 rounded-lg font-bold text-sm text-white"
                style={{ background: "var(--brand)", opacity: regLoading ? 0.7 : 1 }}>
                {regLoading ? "처리 중..." : "가입하기"}
              </button>

              <p className="text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                이미 계정이 있으신가요?{" "}
                <button type="button" onClick={() => setTab("login")} className="font-bold" style={{ color: "var(--brand)" }}>
                  로그인
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
