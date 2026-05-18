"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Partner {
  id: number;
  name: string;
  category: string;
  badge: string;
  desc: string;
  img: string;
  likes: number;
  views: number;
  content: string;
  contact: string;
  site: string;
  createdAt: string;
}

function renderContent(text: string) {
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
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-[13px] font-bold mt-3 mb-1" style={{ color: "var(--text-primary)" }}>
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      const parts = line.replace("- ", "").split(/\*\*(.*?)\*\*/g);
      elements.push(
        <li key={key++} className="text-[12px] ml-3 mb-0.5 list-disc" style={{ color: "var(--text-secondary)" }}>
          {parts.map((p, i) =>
            i % 2 === 1
              ? <strong key={i} style={{ color: "var(--text-primary)" }}>{p}</strong>
              : p
          )}
        </li>
      );
    } else if (line.startsWith("|")) {
      const cells = line.split("|").filter((c) => c.trim() !== "");
      const isHeader = lines[lines.indexOf(line) + 1]?.startsWith("|---");
      const isSeparator = line.includes("---");
      if (isSeparator) continue;
      elements.push(
        <tr key={key++} style={{ borderBottom: "1px solid var(--border)" }}>
          {cells.map((cell, i) => (
            isHeader
              ? <th key={i} className="text-[11px] font-bold px-2 py-1.5 text-left" style={{ color: "var(--text-primary)", background: "var(--bg)" }}>{cell.trim()}</th>
              : <td key={i} className="text-[11px] px-2 py-1.5" style={{ color: "var(--text-secondary)" }}>{cell.trim()}</td>
          ))}
        </tr>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-1" />);
    } else {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {parts.map((p, i) =>
            i % 2 === 1
              ? <strong key={i} style={{ color: "var(--text-primary)" }}>{p}</strong>
              : p
          )}
        </p>
      );
    }
  }

  const wrapped: React.ReactNode[] = [];
  let tableRows: React.ReactNode[] = [];
  for (const el of elements) {
    if ((el as React.ReactElement).type === "tr") {
      tableRows.push(el);
    } else {
      if (tableRows.length > 0) {
        wrapped.push(
          <table key={`table-${key++}`} className="w-full rounded overflow-hidden mb-2" style={{ border: "1px solid var(--border)", borderCollapse: "collapse" }}>
            <tbody>{tableRows}</tbody>
          </table>
        );
        tableRows = [];
      }
      wrapped.push(el);
    }
  }
  if (tableRows.length > 0) {
    wrapped.push(
      <table key={`table-${key++}`} className="w-full rounded overflow-hidden mb-2" style={{ border: "1px solid var(--border)", borderCollapse: "collapse" }}>
        <tbody>{tableRows}</tbody>
      </table>
    );
  }

  return wrapped;
}

export default function PartnerDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeHighlight, setCodeHighlight] = useState(false);

  useEffect(() => {
    fetch(`/api/partners/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPartner(data); setLoading(false); })
      .catch(() => setLoading(false));
    // 좋아요 상태 확인
    fetch(`/api/partners/${id}/like`)
      .then(r => r.json())
      .then(data => setLiked(data.liked))
      .catch(() => {});
  }, [id]);

  if (loading) {
    return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;
  }

  if (!partner) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">업체를 찾을 수 없습니다.</p>
        <Link href="/partners" className="text-xs font-bold mt-2 inline-block" style={{ color: "var(--brand)" }}>← 목록으로</Link>
      </div>
    );
  }

  const createdDate = new Date(partner.createdAt).toLocaleDateString("ko-KR");

  return (
    <div
      className="p-2 flex flex-col gap-3"
      style={{
        zoom: 1.2,
        fontWeight: 700,
        ["--text-secondary" as string]: "rgb(30,41,59)",
      } as React.CSSProperties}
    >

      {/* 뒤로가기 */}
      <Link href="/partners" className="flex items-center gap-1 text-xs font-bold w-fit" style={{ color: "var(--text-secondary)" }}>
        <i className="fas fa-chevron-left text-[10px]" /> 스폰업체 목록
      </Link>

      {/* 카드 헤더 */}
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* 배너 이미지 */}
        <div className="w-full">
          <img src={partner.img} alt={partner.name} className="w-full h-auto block" />
        </div>

        {/* 업체 정보 */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "#1d4ed8", color: "#fff" }}
            >
              {partner.badge}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{partner.category}</span>
          </div>
          <h1 className="text-[17px] font-black mb-1" style={{ color: "var(--text-primary)" }}>{partner.name}</h1>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{partner.desc}</p>

          {/* 메타 */}
          <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <span>👁 {partner.views.toLocaleString()} 조회</span>
            <span>❤️ {partner.likes + (liked ? 1 : 0)} 좋아요</span>
            <span>📅 {createdDate}</span>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-col gap-0.5">
          {renderContent(partner.content)}
        </div>
      </div>

      {/* 연락처 */}
      <div className="rounded-lg p-3 flex flex-col gap-1.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[12px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>🔑 가입코드</p>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 ${codeHighlight ? "scale-[1.02]" : ""}`}
          style={{
            background: codeHighlight ? "var(--brand)" : "var(--bg)",
            border: `2px solid var(--brand)`,
            boxShadow: codeHighlight ? "0 0 16px rgba(14,165,233,0.4)" : "none",
          }}
        >
          <span
            className="text-[20px] font-black tracking-widest transition-colors duration-300"
            style={{ color: codeHighlight ? "#fff" : "var(--brand)" }}
          >
            {partner.contact}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(partner.contact);
              setCopied(true);
              setCodeHighlight(true);
              setTimeout(() => setCodeHighlight(false), 1500);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-[11px] font-bold px-3 py-1.5 rounded transition-all"
            style={{
              background: codeHighlight ? "#fff" : "var(--brand)",
              color: codeHighlight ? "var(--brand)" : "#fff",
            }}
          >
            {codeHighlight ? "✓ 복사됨" : "복사"}
          </button>
        </div>
      </div>

      {/* 복사 완료 모달 */}
      {copied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: "none" }}>
          <div
            className="px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-bounce-in"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", pointerEvents: "auto" }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--brand)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>클립보드에 복사되었습니다</p>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>가입코드: <strong style={{ color: "var(--brand)" }}>{partner.contact}</strong></p>
          </div>
        </div>
      )}

      {/* 하단 액션 */}
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            const res = await fetch(`/api/partners/${id}/like`, { method: "POST" });
            if (res.ok) {
              const data = await res.json();
              setPartner({ ...partner, likes: data.likes });
              setLiked(data.liked);
            } else {
              const err = await res.json();
              if (err.error === "로그인 필요") alert("로그인 후 좋아요 할 수 있습니다.");
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          style={{
            background: liked ? "#fee2e2" : "var(--surface)",
            color: liked ? "#dc2626" : "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {liked ? "❤️" : "🤍"} 좋아요 {partner.likes}
        </button>
        <a
          href={`https://${partner.site}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-2 rounded-lg text-sm font-bold text-white"
          style={{ background: "var(--brand)" }}
        >
          사이트 방문하기 →
        </a>
      </div>

    </div>
  );
}
