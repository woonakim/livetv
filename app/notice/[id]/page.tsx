"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MetaHead from "@/components/ui/MetaHead";

interface Notice {
  id: number; title: string; content: string; author: string;
  isPinned: boolean; viewCount: number; createdAt: string;
}

interface NoticeListItem { id: number; title: string; }

function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-[15px] font-black mt-4 mb-1.5 pb-1" style={{ color: "var(--text-primary)", borderBottom: "2px solid var(--brand)" }}>{line.replace("## ", "")}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-[13px] font-bold mt-3 mb-1" style={{ color: "var(--text-primary)" }}>{line.replace("### ", "")}</h3>);
    } else if (line.startsWith("- ")) {
      const parts = line.replace("- ", "").split(/\*\*(.*?)\*\*/g);
      elements.push(<li key={key++} className="text-[12px] ml-3 mb-0.5 list-disc" style={{ color: "var(--text-secondary)" }}>{parts.map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: "var(--text-primary)" }}>{p}</strong> : p)}</li>);
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-1" />);
    } else {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(<p key={key++} className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{parts.map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: "var(--text-primary)" }}>{p}</strong> : p)}</p>);
    }
  }
  return elements;
}

export default function NoticeDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [allNotices, setAllNotices] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/notices/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/notices").then(r => r.json()),
    ]).then(([detail, list]) => {
      setNotice(detail);
      setAllNotices(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;

  if (!notice) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">공지사항을 찾을 수 없습니다.</p>
        <Link href="/notice" className="text-xs font-bold mt-2 inline-block" style={{ color: "var(--brand)" }}>← 목록으로</Link>
      </div>
    );
  }

  const idx = allNotices.findIndex(n => n.id === id);
  const prevNotice = idx < allNotices.length - 1 ? allNotices[idx + 1] : null;
  const nextNotice = idx > 0 ? allNotices[idx - 1] : null;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3 p-2">
      {notice && <MetaHead title={notice.title} description={notice.content?.replace(/<[^>]*>/g, "").slice(0, 150)} />}
      <Link href="/notice" className="flex items-center gap-1 text-xs font-bold w-fit" style={{ color: "var(--text-secondary)" }}>
        <i className="fas fa-chevron-left text-[10px]" /> 공지사항 목록
      </Link>

      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          {notice.isPinned && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "var(--brand)" }}>공지</span>
          )}
        </div>
        <h1 className="text-[16px] font-black leading-snug mb-3" style={{ color: "var(--text-primary)" }}>{notice.title}</h1>
        <div className="flex items-center gap-3 text-[11px] pt-2" style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <span>{notice.author}</span>
          <span>{formatDate(notice.createdAt)}</span>
          <span>조회 {notice.viewCount}</span>
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {notice.content.includes("<") ? (
          <div className="prose-content text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: notice.content }} />
        ) : (
          <div className="flex flex-col gap-0.5">{renderContent(notice.content)}</div>
        )}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {nextNotice && (
          <Link href={`/notice/${nextNotice.id}`} className="flex items-center gap-2 px-3 py-2.5 text-[12px]" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <span className="shrink-0 font-bold" style={{ color: "var(--brand)" }}>▲ 다음글</span>
            <span className="truncate" style={{ color: "var(--text-primary)" }}>{nextNotice.title}</span>
          </Link>
        )}
        {prevNotice && (
          <Link href={`/notice/${prevNotice.id}`} className="flex items-center gap-2 px-3 py-2.5 text-[12px]" style={{ background: "var(--surface)" }}>
            <span className="shrink-0 font-bold" style={{ color: "var(--text-secondary)" }}>▼ 이전글</span>
            <span className="truncate" style={{ color: "var(--text-primary)" }}>{prevNotice.title}</span>
          </Link>
        )}
      </div>

      <Link href="/notice" className="text-center py-2 rounded-lg text-sm font-bold" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
        목록으로
      </Link>
    </div>
  );
}
