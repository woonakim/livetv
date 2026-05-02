"use client";

import { useState, useEffect } from "react";
import { playAlarm, ALARM_SOUND_LABELS, AlarmSoundKey } from "@/lib/alarm-sounds";

interface Settings {
  showLogoBroadcast: boolean;
  showLogoMain: boolean;
  showLogoAnalysis: boolean;
  showLogoYoutube: boolean;
  anthropicApiKey: string;
  anthropicEnabled: boolean;
  openaiApiKey: string;
  openaiEnabled: boolean;
  geminiApiKey: string;
  geminiEnabled: boolean;
  gnewsApiKey: string;
  youtubeApiKey: string;
  levelDisplayMode: string;
  adminAlarmSound: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const toggle = async (key: keyof Settings) => {
    if (!settings || saving) return;
    setSaving(true);
    const newVal = !settings[key];
    await fetch("/api/admin/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: newVal }),
    });
    setSettings({ ...settings, [key]: newVal });
    setSaving(false);
  };

  if (!settings) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;

  const items = [
    { key: "showLogoBroadcast" as const, label: "스포츠 중계", desc: "중계 페이지 경기 목록에 팀 로고 표시" },
    { key: "showLogoMain" as const, label: "메인 페이지", desc: "메인 페이지 중계 목록에 팀 로고 표시" },
    { key: "showLogoAnalysis" as const, label: "분석 페이지", desc: "분석 포스트 매치카드에 팀 로고 표시" },
    { key: "showLogoYoutube" as const, label: "유튜브 하이라이트", desc: "유튜브 하이라이트에 팀 로고 표시" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>사이트 설정</h1>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>팀 로고 노출 설정</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>페이지별로 팀 로고 표시 여부를 설정합니다</p>
        </div>
        {items.map((item, idx) => (
          <div
            key={item.key}
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "var(--surface)", borderTop: idx > 0 ? "1px solid var(--border)" : "none" }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.label}</p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              disabled={saving}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: settings[item.key] ? "var(--brand)" : "#d1d5db" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ left: settings[item.key] ? "22px" : "2px" }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* 레벨 표기 방식 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>채팅 레벨 표기</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>채팅창에서 회원 레벨을 어떻게 표시할지 선택합니다</p>
        </div>
        <div className="px-4 py-3 flex gap-2" style={{ background: "var(--surface)" }}>
          {[
            { value: "badge", label: "Lv.숫자 뱃지", desc: "Lv.5 형태로 색상별 표시", preview: "🟢 Lv.5" },
            { value: "emoji", label: "이모지/이미지", desc: "레벨 설정의 뱃지 표시", preview: "🥇" },
            { value: "none", label: "표시 안 함", desc: "레벨 뱃지 숨김", preview: "-" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={async () => {
                setSaving(true);
                await fetch("/api/admin/site-settings", {
                  method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ levelDisplayMode: opt.value }),
                });
                setSettings({ ...settings, levelDisplayMode: opt.value });
                setSaving(false);
              }}
              className="flex-1 p-3 rounded-lg text-center transition-all"
              style={{
                background: settings.levelDisplayMode === opt.value ? "var(--brand)" : "var(--bg)",
                color: settings.levelDisplayMode === opt.value ? "#fff" : "var(--text-primary)",
                border: `2px solid ${settings.levelDisplayMode === opt.value ? "var(--brand)" : "var(--border)"}`,
              }}
            >
              <p className="text-lg mb-1">{opt.preview}</p>
              <p className="text-[11px] font-bold">{opt.label}</p>
              <p className="text-[9px] mt-0.5 opacity-70">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 관리자 알림 사운드 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-2.5" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>관리자 알림 사운드</span>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>신규 BJ/픽스터/포인트 교환 신청 시 재생되는 알림음</p>
        </div>
        <div className="px-4 py-3 grid grid-cols-3 gap-2" style={{ background: "var(--surface)" }}>
          {(Object.keys(ALARM_SOUND_LABELS) as AlarmSoundKey[]).map(key => (
            <button
              key={key}
              onClick={async () => {
                playAlarm(key);
                setSaving(true);
                await fetch("/api/admin/site-settings", {
                  method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ adminAlarmSound: key }),
                });
                setSettings({ ...settings, adminAlarmSound: key });
                setSaving(false);
              }}
              className="p-3 rounded-lg text-center transition-all flex flex-col items-center gap-1"
              style={{
                background: settings.adminAlarmSound === key ? "var(--brand)" : "var(--bg)",
                color: settings.adminAlarmSound === key ? "#fff" : "var(--text-primary)",
                border: `2px solid ${settings.adminAlarmSound === key ? "var(--brand)" : "var(--border)"}`,
              }}
            >
              <i className="fas fa-volume-up text-lg" />
              <p className="text-[12px] font-bold">{ALARM_SOUND_LABELS[key]}</p>
              <span className="text-[10px] opacity-70">클릭하여 듣기</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI API 키 설정 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>AI 분석 설정</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>분석글 자동 생성에 사용할 AI를 설정합니다. 토글 OFF 시 글 작성 버튼이 숨겨집니다.</p>
        </div>
        {[
          { keyApi: "anthropicApiKey" as const, keyToggle: "anthropicEnabled" as const, label: "Anthropic (Claude)", placeholder: "sk-ant-api03-...", color: "#d97706" },
          { keyApi: "openaiApiKey" as const, keyToggle: "openaiEnabled" as const, label: "OpenAI (ChatGPT)", placeholder: "sk-...", color: "#10a37f" },
          { keyApi: "geminiApiKey" as const, keyToggle: "geminiEnabled" as const, label: "Google (Gemini)", placeholder: "AIza...", color: "#4285f4" },
        ].map((item, idx) => (
          <div key={item.keyApi} className="px-4 py-3" style={{ background: "var(--surface)", borderTop: idx > 0 ? "1px solid var(--border)" : "none" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.label}</p>
              </div>
              <button
                onClick={async () => {
                  const newVal = !settings[item.keyToggle];
                  setSaving(true);
                  await fetch("/api/admin/site-settings", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [item.keyToggle]: newVal }),
                  });
                  setSettings({ ...settings, [item.keyToggle]: newVal });
                  setSaving(false);
                }}
                disabled={saving}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: settings[item.keyToggle] ? item.color : "#d1d5db" }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: settings[item.keyToggle] ? "22px" : "2px" }} />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={settings[item.keyApi] || ""}
                onChange={e => setSettings({ ...settings, [item.keyApi]: e.target.value })}
                placeholder={item.placeholder}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button
                onClick={async () => {
                  setSaving(true);
                  await fetch("/api/admin/site-settings", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [item.keyApi]: settings[item.keyApi] }),
                  });
                  setSaving(false);
                  alert("저장되었습니다");
                }}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white shrink-0"
                style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}
              >저장</button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: settings[item.keyApi] ? "#16a34a" : "var(--text-secondary)" }}>
              {settings[item.keyApi] ? "✓ 키 설정됨" : "키 미설정"} · {settings[item.keyToggle] ? "노출 중" : "숨김"}
            </p>
          </div>
        ))}
      </div>

      {/* 외부 서비스 API 키 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>외부 서비스 API 키</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>스포츠 뉴스, 유튜브 하이라이트 데이터 수집에 사용됩니다</p>
        </div>
        {[
          { key: "gnewsApiKey" as const, label: "GNews (스포츠 뉴스)", placeholder: "f080b569...", desc: "gnews.io에서 발급", color: "#ef4444" },
          { key: "youtubeApiKey" as const, label: "YouTube Data API", placeholder: "AIzaSy...", desc: "Google Cloud Console에서 발급", color: "#ff0000" },
        ].map((item, idx) => (
          <div key={item.key} className="px-4 py-3" style={{ background: "var(--surface)", borderTop: idx > 0 ? "1px solid var(--border)" : "none" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.label}</p>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={settings[item.key] || ""}
                onChange={e => setSettings({ ...settings, [item.key]: e.target.value })}
                placeholder={item.placeholder}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button
                onClick={async () => {
                  setSaving(true);
                  await fetch("/api/admin/site-settings", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [item.key]: settings[item.key] }),
                  });
                  setSaving(false);
                  alert("저장되었습니다");
                }}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white shrink-0"
                style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}
              >저장</button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: settings[item.key] ? "#16a34a" : "var(--text-secondary)" }}>
              {settings[item.key] ? "✓ 키 설정됨" : "키 미설정"} · {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* 가입 시 추가 정보 수집 — RegistrationSetting */}
      <RegistrationSettingSection />

      {/* 텔레그램 봇 알림 */}
      <TelegramNotifySection />

      {/* 가짜 공개채팅 시청자 부풀리기 */}
      <FakeChatViewerSection />

      <p className="text-[11px] text-center mt-2" style={{ color: "var(--text-secondary)" }}>
        💡 생일 보상 / 분석글 작성 권한 / 채팅 보상 캡은{" "}
        <a href="/admin/rewards" className="font-bold" style={{ color: "var(--brand)" }}>활동 보상 설정</a>
        에서 관리합니다.
      </p>
    </div>
  );
}

// ─── 가입 시 정보 수집 섹션 (RegistrationSetting API) ─────────────
function RegistrationSettingSection() {
  const [setting, setSetting] = useState({ requireName: false, requirePhone: false, requireEmail: false, requireBirthDate: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/registration-setting").then(r => r.json()).then(d => {
      if (d.setting) setSetting({
        requireName: !!d.setting.requireName,
        requirePhone: !!d.setting.requirePhone,
        requireEmail: !!d.setting.requireEmail,
        requireBirthDate: !!d.setting.requireBirthDate,
      });
    }).catch(() => {});
  }, []);

  const items: { key: keyof typeof setting; label: string; desc: string }[] = [
    { key: "requireName", label: "이름 수집", desc: "가입 시 이름 입력 필드 노출 (필수)" },
    { key: "requirePhone", label: "휴대폰 번호 수집", desc: "가입 시 휴대폰 번호 필드 노출 (인증은 별도)" },
    { key: "requireEmail", label: "이메일 수집", desc: "가입 시 이메일 필드 노출 (필수)" },
    { key: "requireBirthDate", label: "생년월일 수집", desc: "가입 시 생년월일 필드 노출 (등록 후 변경 불가)" },
  ];

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>가입 시 추가 정보 수집</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>회원가입 폼에 노출할 입력 항목 (전부 필수 입력)</p>
      </div>
      {items.map((item, idx) => (
        <div key={item.key} className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface)", borderTop: idx > 0 ? "1px solid var(--border)" : "none" }}>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.label}</p>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
          </div>
          <button
            onClick={async () => {
              setSaving(true);
              const newVal = !setting[item.key];
              const next = { ...setting, [item.key]: newVal };
              await fetch("/api/admin/registration-setting", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(next),
              });
              setSetting(next);
              setSaving(false);
            }}
            disabled={saving}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: setting[item.key] ? "var(--brand)" : "#d1d5db" }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: setting[item.key] ? "22px" : "2px" }} />
          </button>
        </div>
      ))}
    </div>
  );
}

interface Subscriber { chatId: string; username: string; firstName: string; subscribedAt: string }

// ─── 텔레그램 봇 알림 섹션 ─────────────
function TelegramNotifySection() {
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState("");
  const [passcode, setPasscode] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const flashMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 5000); };

  const loadSubscribers = () => {
    fetch("/api/admin/telegram-subscribers").then(r => r.json()).then(d => Array.isArray(d) ? setSubscribers(d) : setSubscribers([])).catch(() => {});
  };

  useEffect(() => {
    fetch("/api/admin/site-settings").then(r => r.json()).then(d => {
      setEnabled(!!d?.telegramNotifyEnabled);
      setToken(d?.telegramBotToken || "");
      setPasscode(d?.telegramSubscribePasscode || "");
    }).catch(() => {});
    loadSubscribers();
  }, []);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    await fetch("/api/admin/site-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
  };

  const sendTest = async () => {
    const res = await fetch("/api/admin/telegram-test", { method: "POST" });
    const j = await res.json();
    flashMsg(j.ok ? `✓ 발송 성공 (${j.sent}/${j.sent + j.failed}명)` : `✗ 실패: ${j.error || "?"}`);
  };

  const setupWebhook = async () => {
    const res = await fetch("/api/admin/telegram-webhook-setup", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "register" }),
    });
    const j = await res.json();
    flashMsg(j.ok ? `✓ Webhook 등록됨: ${j.webhookUrl}` : `✗ 실패: ${JSON.stringify(j.telegramResponse?.description || j)}`);
  };

  const deleteSubscriber = async (chatId: string) => {
    if (!confirm("구독자를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/telegram-subscribers?chatId=${encodeURIComponent(chatId)}`, { method: "DELETE" });
    loadSubscribers();
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>📨 텔레그램 봇 알림</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          픽스터/BJ/포인트 교환 신청 시 텔레그램 봇으로 알림 발송. 비밀번호 인증을 통과한 구독자에게만 발송됩니다.
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
          ⓘ <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>@BotFather</a>로 봇 생성 → 봇 토큰 받기 → 토큰/비밀번호 저장 → Webhook 등록 → 봇과 대화 후 <code className="px-1 rounded" style={{ background: "var(--bg)" }}>/start</code> + 비밀번호 입력
        </p>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>활성화</p>
        <button onClick={async () => { const v = !enabled; setEnabled(v); await patch({ telegramNotifyEnabled: v }); }} disabled={saving} className="relative w-11 h-6 rounded-full transition-colors" style={{ background: enabled ? "var(--brand)" : "#d1d5db" }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: enabled ? "22px" : "2px" }} />
        </button>
      </div>
      <div className="px-4 py-3 border-t space-y-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <label className="text-[11px] font-bold block" style={{ color: "var(--text-secondary)" }}>봇 토큰</label>
        <div className="flex gap-2">
          <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="123456:ABC-DEF..." className="flex-1 rounded-lg px-3 py-2 text-sm font-mono" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <button onClick={() => patch({ telegramBotToken: token })} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>저장</button>
        </div>
      </div>
      <div className="px-4 py-3 border-t space-y-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <label className="text-[11px] font-bold block" style={{ color: "var(--text-secondary)" }}>구독 비밀번호</label>
        <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>봇 사용자가 <code className="px-1 rounded" style={{ background: "var(--bg)" }}>/start</code> 후 입력해야 알림 구독자로 등록됩니다.</p>
        <div className="flex gap-2">
          <input value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="원하는 비밀번호 (예: livefelix2026)" className="flex-1 rounded-lg px-3 py-2 text-sm font-mono" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <button onClick={() => patch({ telegramSubscribePasscode: passcode })} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>저장</button>
        </div>
      </div>
      <div className="px-4 py-3 border-t flex flex-wrap items-center gap-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <button onClick={setupWebhook} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "#10b981" }}>
          🔗 Webhook 등록 (봇 활성화)
        </button>
        <button onClick={sendTest} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "#3b82f6" }}>
          🧪 테스트 메시지
        </button>
        {msg && <span className="text-[12px] font-bold" style={{ color: msg.startsWith("✓") ? "#16a34a" : "#dc2626" }}>{msg}</span>}
      </div>
      <div className="px-4 py-3 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>구독자 목록 ({subscribers.length}명)</p>
          <button onClick={loadSubscribers} className="text-[10px] underline" style={{ color: "var(--text-secondary)" }}>새로고침</button>
        </div>
        {subscribers.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>아직 구독자가 없습니다. 봇과 대화 후 비밀번호를 입력하면 여기에 표시됩니다.</p>
        ) : (
          <div className="space-y-1">
            {subscribers.map(s => (
              <div key={s.chatId} className="flex items-center justify-between text-[12px] py-1 px-2 rounded" style={{ background: "var(--bg)" }}>
                <span style={{ color: "var(--text-primary)" }}>
                  {s.firstName || "(이름 없음)"} {s.username && <span style={{ color: "var(--text-secondary)" }}>@{s.username}</span>}
                  <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>{s.chatId}</span>
                </span>
                <button onClick={() => deleteSubscriber(s.chatId)} className="text-[11px] text-red-500 hover:underline">삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 가짜 공개채팅 시청자 부풀리기 ─────────────
function FakeChatViewerSection() {
  const [enabled, setEnabled] = useState(false);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/site-settings").then(r => r.json()).then(d => {
      setEnabled(!!d?.fakeViewersChatEnabled);
      setMin(d?.fakeViewersChatMin ?? 0);
      setMax(d?.fakeViewersChatMax ?? 0);
    }).catch(() => {});
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch("/api/admin/site-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) flash("✓ 저장됨"); else flash("✗ 저장 실패");
  };

  const saveRange = () => {
    if (min < 0 || max < 0) return flash("✗ 0 이상 입력");
    if (max < min) return flash("✗ 최대값이 최소값보다 작음");
    patch({ fakeViewersChatMin: min, fakeViewersChatMax: max });
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>👥 공개채팅 시청자수 부풀리기</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          메인 화면 라이브 공개채팅의 시청자 수에 가짜 boost를 더해 표시합니다. 실제 접속자 + 가짜값(min~max 사이 random walk, 3~5초마다 변동).
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>관리자에게는 <code>표시값(실제값)</code> 형식으로 노출됩니다.</p>
      </div>
      <div className="px-4 py-3 space-y-3" style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>활성화</span>
          <button
            onClick={async () => { const v = !enabled; setEnabled(v); await patch({ fakeViewersChatEnabled: v }); }}
            disabled={saving}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: enabled ? "var(--brand)" : "#d1d5db" }}
          >
            <span className="absolute rounded-full transition-all" style={{ top: 2, left: enabled ? 22 : 2, width: 20, height: 20, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)" }} />
          </button>
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>가짜 boost 범위 (min ~ max)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={min} onChange={e => setMin(parseInt(e.target.value) || 0)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>~</span>
            <input type="number" min={0} value={max} onChange={e => setMax(parseInt(e.target.value) || 0)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <button onClick={saveRange} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>저장</button>
          </div>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>예: min 80, max 150 → 표시값 = 실제 접속자 + 무작위(80~150)</p>
        </div>
        {msg && <p className="text-[11px] font-bold" style={{ color: msg.startsWith("✓") ? "#10b981" : "#ef4444" }}>{msg}</p>}
      </div>
    </div>
  );
}
