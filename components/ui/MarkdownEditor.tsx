"use client";

import { useState, useRef, useCallback } from "react";

function renderPreview(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-[15px] font-black mt-4 mb-1.5 pb-1" style={{ color: "var(--text-primary)", borderBottom: "2px solid var(--brand)" }}>
          {line.replace("## ", "")}
        </h2>
      );
      continue;
    }
    if (line.startsWith("- ")) {
      const parts = line.replace("- ", "").split(/\*\*(.*?)\*\*/g);
      elements.push(
        <li key={key++} className="text-[12px] ml-3 mb-0.5 list-disc" style={{ color: "var(--text-secondary)" }}>
          {parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: "var(--text-primary)" }}>{part}</strong> : part)}
        </li>
      );
      continue;
    }
    if (line.trim() === "") { elements.push(<div key={key++} className="h-1" />); continue; }
    const parts = line.split(/\*\*(.*?)\*\*/g);
    elements.push(
      <p key={key++} className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: "var(--text-primary)" }}>{part}</strong> : part)}
      </p>
    );
  }
  return elements;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  onAiGenerate?: (provider: "anthropic" | "openai" | "gemini") => void;
  aiLoading?: boolean;
  aiProviders?: { anthropic?: boolean; openai?: boolean; gemini?: boolean };
}

export default function MarkdownEditor({ value, onChange, placeholder, rows = 12, onAiGenerate, aiLoading, aiProviders }: Props) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback((before: string, after: string = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newText = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newText);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    }, 0);
  }, [value, onChange]);

  const toolbarButtons = [
    { label: "H2", title: "소제목", action: () => insertAtCursor("\n## ", "\n") },
    { label: "B", title: "굵게", action: () => insertAtCursor("**", "**"), bold: true },
    { label: "- ", title: "리스트", action: () => insertAtCursor("\n- ", "") },
    { label: "- B", title: "굵은 리스트", action: () => insertAtCursor("\n- **", "**") },
    { label: "\\n", title: "빈 줄", action: () => insertAtCursor("\n\n", "") },
  ];

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div>
      {/* 툴바 */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className="px-2 py-1 rounded text-[11px] transition-colors hover:opacity-80"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontWeight: btn.bold ? 800 : 600 }}
          >
            {btn.label}
          </button>
        ))}
        <div className="flex-1" />
        {onAiGenerate && (
          <div className="flex items-center gap-0.5">
            {aiProviders?.anthropic && (
              <button
                type="button"
                onClick={() => onAiGenerate("anthropic")}
                disabled={aiLoading}
                className="px-2 py-1 rounded-l text-[10px] font-bold flex items-center gap-1"
                style={{ background: aiLoading ? "#9ca3af" : "linear-gradient(135deg, #d97706, #b45309)", color: "#fff", border: "none", opacity: aiLoading ? 0.7 : 1 }}
              >
                {aiLoading ? <span className="w-3 h-3 rounded-full animate-spin border border-white/30 border-t-white" /> : "✨"} Claude
              </button>
            )}
            {aiProviders?.openai && (
              <button
                type="button"
                onClick={() => onAiGenerate("openai")}
                disabled={aiLoading}
                className={`px-2 py-1 text-[10px] font-bold flex items-center gap-1 ${!aiProviders?.anthropic ? "rounded-l" : ""} ${!aiProviders?.gemini ? "rounded-r" : ""}`}
                style={{ background: aiLoading ? "#9ca3af" : "linear-gradient(135deg, #10a37f, #0d8c6d)", color: "#fff", border: "none", opacity: aiLoading ? 0.7 : 1 }}
              >
                {aiLoading ? <span className="w-3 h-3 rounded-full animate-spin border border-white/30 border-t-white" /> : "🤖"} GPT
              </button>
            )}
            {aiProviders?.gemini && (
              <button
                type="button"
                onClick={() => onAiGenerate("gemini")}
                disabled={aiLoading}
                className="px-2 py-1 rounded-r text-[10px] font-bold flex items-center gap-1"
                style={{ background: aiLoading ? "#9ca3af" : "linear-gradient(135deg, #4285f4, #1a73e8)", color: "#fff", border: "none", opacity: aiLoading ? 0.7 : 1 }}
              >
                {aiLoading ? <span className="w-3 h-3 rounded-full animate-spin border border-white/30 border-t-white" /> : "💎"} Gemini
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (value.trim() && !confirm("현재 내용을 템플릿으로 교체하시겠습니까?")) return;
            onChange(`경기 소개와 핵심 포인트를 간략하게 작성해주세요.

## 경기 핵심 포인트

- **홈팀의 강점**을 작성해주세요.
- **원정팀의 강점**을 작성해주세요.
- **승부 포인트**가 될 요소를 작성해주세요.

## 전술 / 데이터 분석

양 팀의 전술적 특징, 최근 폼, 상대 전적, 주요 선수 컨디션 등을 분석해주세요.

이번 경기에서 주목할 부분과 변수를 자유롭게 서술해주세요.

## 분석 결론

종합적인 분석 결론을 작성해주세요.

- 추천 픽: **팀명 승/무/패**
- 대안 픽: **양 팀 득점 / 언더 등**
- 예상 스코어: **0-0**`);
          }}
          className="px-2.5 py-1 rounded text-[11px] font-bold"
          style={{ background: "#f59e0b", color: "#fff", border: "1px solid #f59e0b" }}
        >
          템플릿
        </button>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="px-2.5 py-1 rounded text-[11px] font-bold"
          style={{ background: preview ? "var(--brand)" : "var(--surface)", color: preview ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          {preview ? "편집" : "미리보기"}
        </button>
      </div>

      {preview ? (
        /* 미리보기 */
        <div className="rounded-lg p-4 min-h-[200px]" style={{ ...inputStyle, minHeight: rows * 24 }}>
          {value ? (
            <div className="flex flex-col gap-0.5">{renderPreview(value)}</div>
          ) : (
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>내용을 입력하세요</p>
          )}
        </div>
      ) : (
        /* 에디터 */
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "마크다운 형식으로 작성하세요\n\n## 소제목\n- **굵은 리스트**\n일반 텍스트에 **강조** 가능"}
          rows={rows}
          className="w-full rounded-lg px-3 py-2 text-sm resize-none font-mono"
          style={inputStyle}
        />
      )}

      {/* 서식 가이드 */}
      {!preview && (
        <div className="mt-1.5 rounded-lg px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>서식 가이드</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
            <span><code className="px-1 rounded" style={{ background: "var(--surface)" }}>## 제목</code> → 소제목</span>
            <span><code className="px-1 rounded" style={{ background: "var(--surface)" }}>**텍스트**</code> → <strong style={{ color: "var(--text-primary)" }}>굵게</strong></span>
            <span><code className="px-1 rounded" style={{ background: "var(--surface)" }}>- 항목</code> → 리스트</span>
            <span><code className="px-1 rounded" style={{ background: "var(--surface)" }}>- **항목**</code> → 굵은 리스트</span>
          </div>
        </div>
      )}
    </div>
  );
}
