"use client";

import { useEffect, useState, useCallback } from "react";
import ImageUpload from "@/components/ui/ImageUpload";

interface SeoSettings {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoOgImage: string;
  seoFavicon: string;
  seoNaverVerification: string;
  seoGoogleVerification: string;
  seoGaId: string;
  seoRobotsTxt: string;
}

const DEFAULTS: SeoSettings = {
  seoTitle: "", seoDescription: "", seoKeywords: "", seoOgImage: "", seoFavicon: "",
  seoNaverVerification: "", seoGoogleVerification: "", seoGaId: "", seoRobotsTxt: "",
};

export default function AdminSeoPage() {
  const [data, setData] = useState<SeoSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/seo").then(r => r.json()).then(d => setData({ ...DEFAULTS, ...d })).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/seo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setSaving(false);
    setMsg("저장되었습니다. 변경사항은 다음 페이지 로드부터 적용됩니다.");
    setTimeout(() => setMsg(""), 4000);
  };

  const set = (key: keyof SeoSettings, val: string) => setData(prev => ({ ...prev, [key]: val }));
  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  if (loading) return <div className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>SEO 설정</h1>
        <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded text-[12px] font-bold text-white" style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {msg && <div className="px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {/* 기본 메타태그 */}
      <Section title="기본 메타태그">
        <Field label="사이트 제목" sub="<title> 태그 + OG 제목">
          <input value={data.seoTitle} onChange={e => set("seoTitle", e.target.value)} className="w-full h-8 px-2 rounded text-[13px]" style={inputStyle} placeholder="라이브Felix - 스포츠 중계 분석 커뮤니티" />
        </Field>
        <Field label="사이트 설명" sub="<meta name='description'> + OG 설명">
          <textarea value={data.seoDescription} onChange={e => set("seoDescription", e.target.value)} rows={3} className="w-full px-2 py-1.5 rounded text-[13px] resize-y" style={inputStyle} placeholder="축구, 야구, 농구 무료 스포츠 중계 및 분석 플랫폼." />
          <CharCount text={data.seoDescription} max={160} />
        </Field>
        <Field label="키워드" sub="<meta name='keywords'> 쉼표로 구분">
          <input value={data.seoKeywords} onChange={e => set("seoKeywords", e.target.value)} className="w-full h-8 px-2 rounded text-[13px]" style={inputStyle} placeholder="스포츠중계,무료중계,EPL,NBA" />
        </Field>
        <Field label="OG 이미지" sub="소셜 공유 시 표시되는 대표 이미지 (1200x630 권장)">
          <ImageUpload value={data.seoOgImage} onChange={v => set("seoOgImage", v)} category="seo" label="OG 이미지" width={240} height={126} />
        </Field>
        <Field label="파비콘 (Favicon)" sub="브라우저 탭에 표시되는 아이콘 (32x32 또는 SVG 권장)">
          <div className="flex items-center gap-4">
            <ImageUpload value={data.seoFavicon} onChange={v => set("seoFavicon", v)} category="seo" label="파비콘" width={48} height={48} />
            {data.seoFavicon && (
              <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.seoFavicon} alt="favicon" className="w-4 h-4" />
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>탭 미리보기</span>
              </div>
            )}
          </div>
        </Field>
      </Section>

      {/* 검색엔진 인증 */}
      <Section title="검색엔진 인증">
        <Field label="네이버 사이트 인증 코드" sub="네이버 서치어드바이저에서 발급받은 인증 코드">
          <input value={data.seoNaverVerification} onChange={e => set("seoNaverVerification", e.target.value)} className="w-full h-8 px-2 rounded text-[13px] font-mono" style={inputStyle} placeholder="abcdef1234567890" />
        </Field>
        <Field label="구글 사이트 인증 코드" sub="Google Search Console에서 발급받은 인증 코드">
          <input value={data.seoGoogleVerification} onChange={e => set("seoGoogleVerification", e.target.value)} className="w-full h-8 px-2 rounded text-[13px] font-mono" style={inputStyle} placeholder="abcdef1234567890" />
        </Field>
      </Section>

      {/* 분석 도구 */}
      <Section title="분석 도구">
        <Field label="Google Analytics 4 측정 ID" sub="GA4 데이터 스트림의 측정 ID (G-XXXXXXXXXX)">
          <input value={data.seoGaId} onChange={e => set("seoGaId", e.target.value)} className="w-full h-8 px-2 rounded text-[13px] font-mono" style={inputStyle} placeholder="G-XXXXXXXXXX" />
        </Field>
      </Section>

      {/* robots.txt */}
      <Section title="robots.txt">
        <Field label="robots.txt 내용" sub="검색 봇 크롤링 규칙 설정">
          <textarea value={data.seoRobotsTxt} onChange={e => set("seoRobotsTxt", e.target.value)} rows={6} className="w-full px-2 py-1.5 rounded text-[12px] font-mono resize-y" style={inputStyle} />
        </Field>
      </Section>

      {/* 미리보기 */}
      <Section title="구글 검색 결과 미리보기">
        <div className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid #dfe1e5" }}>
          <div className="text-[14px] text-[#1a0dab] font-medium truncate">{data.seoTitle || "라이브Felix - 스포츠 중계 분석 커뮤니티"}</div>
          <div className="text-[12px] text-[#006621] mt-0.5">https://livefelix.com</div>
          <div className="text-[13px] text-[#545454] mt-1 line-clamp-2">{data.seoDescription || "축구, 야구, 농구, 배구, UFC, LOL 무료 스포츠 중계 및 분석 플랫폼."}</div>
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="h-8 px-6 rounded text-[12px] font-bold text-white" style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function CharCount({ text, max }: { text: string; max: number }) {
  const len = text.length;
  return (
    <p className="text-[10px] mt-0.5" style={{ color: len > max ? "#dc2626" : "var(--text-secondary)" }}>
      {len}/{max}자 {len > max && "(권장 길이 초과)"}
    </p>
  );
}
