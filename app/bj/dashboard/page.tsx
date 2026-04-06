"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface BjProfile {
  id: number; streamKey: string; title: string; description: string;
  category: string; thumbnail: string; offlineMsg: string; isLive: boolean; isApproved: boolean;
  isActive: boolean; viewCount: number; avatar: string; avatarType: string; statusMessage: string;
  bannerUrl: string; bannerText: string; pinnedMessage: string; systemMessages: string;
}

interface SystemMsg { text: string; intervalMin: number; }
interface ChatBan { id: number; userId: number; nickname: string; createdAt: string; }
interface ChatManager { id: number; userId: number; nickname: string; createdAt: string; }

const RTMP_URL = "rtmp://38.180.201.85:1935/live";
const EMOJI_LIST = ["👑", "🎬", "🎤", "🔥", "⭐", "💎", "🏆", "🎯", "🦁", "🐯", "🦊", "🐻", "🎮", "⚽", "🏀", "⚾", "🎸", "🎵", "💜", "💙"];

export default function BjDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BjProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState("");
  const [offlineMsg, setOfflineMsg] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarType, setAvatarType] = useState("emoji");
  const [statusMessage, setStatusMessage] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [pinnedMessage, setPinnedMessage] = useState("");
  const [systemMsgs, setSystemMsgs] = useState<SystemMsg[]>([]);
  const [chatBans, setChatBans] = useState<ChatBan[]>([]);
  const [managers, setManagers] = useState<ChatManager[]>([]);
  const [managerInput, setManagerInput] = useState("");
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/bj/me").then(r => r.json()).then(data => {
      if (!data) { router.push("/mypage"); return; }
      setProfile(data);
      setTitle(data.title || "");
      setDescription(data.description || "");
      setCategory(data.category || "");
      setOfflineMsg(data.offlineMsg || "");
      setAvatar(data.avatar || "");
      setAvatarType(data.avatarType || "emoji");
      setStatusMessage(data.statusMessage || "");
      setBannerUrl(data.bannerUrl || "");
      setBannerText(data.bannerText || "가입문의");
      setPinnedMessage(data.pinnedMessage || "");
      try { setSystemMsgs(JSON.parse(data.systemMessages || "[]")); } catch { setSystemMsgs([]); }
      fetch(`/api/bj/chat/ban?bjId=${data.id}`).then(r => r.json()).then(setChatBans).catch(() => {});
      fetch(`/api/bj/chat/manager?bjId=${data.id}`).then(r => r.json()).then(setManagers).catch(() => {});
    }).catch(() => router.push("/")).finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/bj/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, category, offlineMsg, avatar, avatarType, statusMessage }) });
    setSaving(false);
    alert("저장되었습니다");
  };

  const handleSaveChatSettings = async () => {
    setSaving(true);
    await fetch("/api/bj/me", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerUrl, bannerText, pinnedMessage, systemMessages: systemMsgs }),
    });
    setSaving(false);
    alert("채팅 설정이 저장되었습니다");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/bj/avatar", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      setAvatar(data.url);
      setAvatarType("image");
    }
  };

  const addSystemMsg = () => setSystemMsgs([...systemMsgs, { text: "", intervalMin: 5 }]);
  const removeSystemMsg = (idx: number) => setSystemMsgs(systemMsgs.filter((_, i) => i !== idx));
  const updateSystemMsg = (idx: number, field: keyof SystemMsg, val: string | number) => {
    setSystemMsgs(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  };

  const unbanUser = async (banUserId: number) => {
    if (!profile) return;
    await fetch(`/api/bj/chat/ban?bjId=${profile.id}&userId=${banUserId}`, { method: "DELETE" });
    setChatBans(chatBans.filter(b => b.userId !== banUserId));
  };

  const addManager = async () => {
    if (!profile || !managerInput.trim()) return;
    const res = await fetch("/api/bj/chat/manager", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bjId: profile.id, nickname: managerInput.trim() }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    setManagerInput("");
    fetch(`/api/bj/chat/manager?bjId=${profile.id}`).then(r => r.json()).then(setManagers).catch(() => {});
  };

  const removeManager = async (userId: number) => {
    if (!profile) return;
    await fetch(`/api/bj/chat/manager?bjId=${profile.id}&userId=${userId}`, { method: "DELETE" });
    setManagers(managers.filter(m => m.userId !== userId));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} /></div>;
  if (!profile) return null;

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="w-full p-4 space-y-5">
      <h1 className="text-xl font-black" style={{ color: "var(--brand)" }}>BJ 대시보드</h1>

      {/* 상태 */}
      {!profile.isApproved ? (
        <div className="rounded-xl p-5" style={{ background: "#fef3c7", border: "1px solid #fbbf24" }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">&#x23F3;</span>
            <div>
              <p className="text-lg font-black" style={{ color: "#92400e" }}>BJ 승인 대기중</p>
              <p className="text-sm" style={{ color: "#a16207" }}>관리자 승인 후 스트림키 확인 및 방송이 가능합니다.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-5" style={{ background: profile.isLive ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "var(--surface)", border: "1px solid var(--border)", color: profile.isLive ? "#fff" : "var(--text-primary)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black">{profile.isLive ? "● LIVE 방송 중" : "방송 대기"}</p>
              <p className="text-sm mt-1 opacity-80">누적 시청: {profile.viewCount.toLocaleString()}회</p>
            </div>
          </div>
        </div>
      )}

      {/* 스트림 설정 (승인 후에만) */}
      {profile.isApproved && <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>OBS 방송 설정</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>서버 URL</label>
            <div className="flex gap-2">
              <input value={RTMP_URL} readOnly className="flex-1 rounded-lg px-3 py-2 text-sm font-mono" style={inputStyle} />
              <button onClick={() => copyToClipboard(RTMP_URL, "url")} className="text-xs font-bold px-3 py-2 rounded-lg text-white shrink-0" style={{ background: "var(--brand)" }}>
                {copied === "url" ? "✓" : "복사"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>스트림 키</label>
            <div className="flex gap-2">
              <input value={showKey ? profile.streamKey : "••••••••••••••••"} readOnly className="flex-1 rounded-lg px-3 py-2 text-sm font-mono" style={inputStyle} />
              <button onClick={() => setShowKey(!showKey)} className="text-xs font-bold px-3 py-2 rounded-lg shrink-0" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {showKey ? "숨기기" : "보기"}
              </button>
              <button onClick={() => copyToClipboard(profile.streamKey, "key")} className="text-xs font-bold px-3 py-2 rounded-lg text-white shrink-0" style={{ background: "var(--brand)" }}>
                {copied === "key" ? "✓" : "복사"}
              </button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#dc2626" }}>스트림 키는 절대 공유하지 마세요!</p>
          </div>
        </div>
      </div>}

      {/* 프로필 아바타 설정 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>프로필 아바타</h2>
        <div className="space-y-3">
          {/* 미리보기 */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--bg)", border: "2px solid var(--border)" }}>
              {avatarType === "image" && avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : avatar ? (
                <span className="text-3xl">{avatar}</span>
              ) : (
                <span className="text-2xl font-black" style={{ color: "var(--text-secondary)" }}>?</span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>방송 프로필 이미지</p>
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>영상 하단 BJ 정보에 표시됩니다</p>
            </div>
          </div>

          {/* 타입 선택 */}
          <div className="flex gap-2">
            <button onClick={() => setAvatarType("emoji")} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: avatarType === "emoji" ? "var(--brand)" : "var(--bg)", color: avatarType === "emoji" ? "#fff" : "var(--text-primary)", border: "1px solid var(--border)" }}>
              이모지 선택
            </button>
            <button onClick={() => setAvatarType("image")} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: avatarType === "image" ? "var(--brand)" : "var(--bg)", color: avatarType === "image" ? "#fff" : "var(--text-primary)", border: "1px solid var(--border)" }}>
              이미지 업로드
            </button>
          </div>

          {/* 이모지 선택 */}
          {avatarType === "emoji" && (
            <div className="flex flex-wrap gap-2">
              {EMOJI_LIST.map(emoji => (
                <button key={emoji} onClick={() => setAvatar(emoji)} className="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all" style={{ background: avatar === emoji ? "var(--brand)" : "var(--bg)", border: avatar === emoji ? "2px solid var(--brand)" : "1px solid var(--border)" }}>
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* 이미지 업로드 */}
          {avatarType === "image" && (
            <div>
              <input ref={avatarFileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button onClick={() => avatarFileRef.current?.click()} className="w-full py-2.5 rounded-lg text-sm font-bold" style={{ background: "var(--bg)", border: "1px dashed var(--border)", color: "var(--text-secondary)" }}>
                {avatar && avatarType === "image" ? "이미지 변경" : "이미지 선택 (2MB 이하)"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 방송 정보 설정 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>방송 정보</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>방송 제목</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="방송 제목을 입력하세요" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>방송 설명</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="방송 설명" className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>카테고리</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              <option value="">선택 안 함</option>
              <option value="soccer">축구</option>
              <option value="baseball">야구</option>
              <option value="basketball">농구</option>
              <option value="esports">e스포츠</option>
              <option value="talk">토크</option>
              <option value="etc">기타</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>방송 상태 메시지</label>
            <input value={statusMessage} onChange={e => setStatusMessage(e.target.value)} placeholder="방송 중 하단에 표시할 상태 메시지" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>영상 하단 정보바에 표시됩니다 (예: 19:00 축구 중계 시작)</p>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>비방송 시 대기 메시지</label>
            <input value={offlineMsg} onChange={e => setOfflineMsg(e.target.value)} placeholder="방송 준비 중입니다. 잠시만 기다려주세요!" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "저장 중..." : "방송 정보 저장"}
          </button>
        </div>
      </div>

      {/* 채팅 관리 설정 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>채팅 관리</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>가입문의 배너 링크</label>
            <div className="flex gap-2">
              <input value={bannerText} onChange={e => setBannerText(e.target.value)} placeholder="가입문의" className="w-[120px] rounded-lg px-3 py-2 text-sm" style={inputStyle} />
              <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://t.me/..." className="flex-1 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>채팅 상단 및 영상 하단에 표시됩니다. 비워두면 숨겨집니다.</p>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>고정 메시지</label>
            <input value={pinnedMessage} onChange={e => setPinnedMessage(e.target.value)} placeholder="고정할 메시지를 입력하세요" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>시스템 메시지 (자동 노출)</label>
              <button onClick={addSystemMsg} className="text-[11px] font-bold px-2 py-1 rounded" style={{ background: "var(--brand)", color: "#fff" }}>+ 추가</button>
            </div>
            {systemMsgs.length === 0 && <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>등록된 시스템 메시지가 없습니다.</p>}
            {systemMsgs.map((sm, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <input value={sm.text} onChange={e => updateSystemMsg(idx, "text", e.target.value)} placeholder="시스템 메시지 내용" className="flex-1 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" value={sm.intervalMin} onChange={e => updateSystemMsg(idx, "intervalMin", parseInt(e.target.value) || 1)} min={1} max={60} className="w-14 rounded-lg px-2 py-2 text-sm text-center" style={inputStyle} />
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>분</span>
                </div>
                <button onClick={() => removeSystemMsg(idx)} className="text-red-500 text-xs font-bold px-2 py-2 rounded hover:bg-red-500/10">✕</button>
              </div>
            ))}
          </div>
          <button onClick={handleSaveChatSettings} disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "저장 중..." : "채팅 설정 저장"}
          </button>
        </div>
      </div>

      {/* 매니저 관리 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>매니저 관리</h2>
        <p className="text-[10px] mb-3" style={{ color: "var(--text-secondary)" }}>매니저는 채팅 메시지 삭제와 사용자 차단 권한을 가집니다.</p>
        <div className="flex gap-2 mb-3">
          <input value={managerInput} onChange={e => setManagerInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addManager()} placeholder="닉네임 입력" className="flex-1 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          <button onClick={addManager} className="px-4 py-2 rounded-lg text-sm font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>지정</button>
        </div>
        {managers.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>지정된 매니저가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {managers.map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#10b981" }}>매니저</span>
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{m.nickname}</span>
                </div>
                <button onClick={() => removeManager(m.userId)} className="text-xs font-bold px-3 py-1 rounded-lg text-red-500 hover:bg-red-500/10" style={{ border: "1px solid #ef4444" }}>해제</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 채팅 차단 목록 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>채팅 차단 목록</h2>
        {chatBans.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>차단된 사용자가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {chatBans.map(ban => (
              <div key={ban.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{ban.nickname || `사용자 #${ban.userId}`}</span>
                  <span className="text-[10px] ml-2" style={{ color: "var(--text-secondary)" }}>{new Date(ban.createdAt).toLocaleDateString()}</span>
                </div>
                <button onClick={() => unbanUser(ban.userId)} className="text-xs font-bold px-3 py-1 rounded-lg text-red-500 hover:bg-red-500/10" style={{ border: "1px solid #ef4444" }}>차단해제</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OBS 가이드 */}
      <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>OBS 설정 가이드</h2>
        <ol className="space-y-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          <li>1. OBS Studio를 실행합니다.</li>
          <li>2. 설정 → 방송 → 서비스: <strong>사용자 지정</strong> 선택</li>
          <li>3. 서버: 위의 <strong>서버 URL</strong>을 붙여넣기</li>
          <li>4. 스트림 키: 위의 <strong>스트림 키</strong>를 붙여넣기</li>
          <li>5. <strong>방송 시작</strong> 클릭 → 사이트에 자동 노출됩니다</li>
        </ol>
      </div>
    </div>
  );
}
