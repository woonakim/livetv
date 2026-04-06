"use client";

import { useState, useEffect } from "react";

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
    </div>
  );
}
