"use client";

import { useEffect, useState } from "react";

interface PopupData {
  id: number;
  name: string;
  imageUrl: string;
  linkUrl: string;
  width: number;
  height: number;
  posX: number;
  posY: number;
  hideToday: boolean;
}

export default function Popup() {
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  useEffect(() => {
    // 오늘 하루 안보기 체크
    const stored = localStorage.getItem("popup_hidden_ids");
    const hiddenDate = localStorage.getItem("popup_hidden_date");
    const today = new Date().toDateString();
    let hiddenIds = new Set<number>();
    if (stored && hiddenDate === today) {
      try { hiddenIds = new Set(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setHidden(hiddenIds);

    fetch("/api/popups")
      .then(r => r.json())
      .then(data => setPopups(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const close = (id: number) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  const closeToday = (id: number) => {
    const newHidden = new Set(hidden);
    newHidden.add(id);
    setHidden(newHidden);
    localStorage.setItem("popup_hidden_ids", JSON.stringify(Array.from(newHidden)));
    localStorage.setItem("popup_hidden_date", new Date().toDateString());
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  const visiblePopups = popups.filter(p => !hidden.has(p.id) && p.imageUrl);

  if (visiblePopups.length === 0) return null;

  return (
    <>
      {visiblePopups.map((popup, idx) => (
        <div
          key={popup.id}
          className="fixed z-[9999] flex flex-col rounded-lg overflow-hidden shadow-2xl"
          style={{
            left: `${popup.posX + idx * 30}px`,
            top: `${popup.posY + idx * 30}px`,
            width: `${popup.width}px`,
            maxWidth: "90vw",
          }}
        >
          {/* 팝업 이미지 */}
          {popup.linkUrl ? (
            <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={popup.imageUrl} alt={popup.name} style={{ width: "100%", height: "auto", display: "block" }} />
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={popup.imageUrl} alt={popup.name} style={{ width: "100%", height: "auto", display: "block" }} />
          )}

          {/* 버튼 영역 */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#222" }}>
            {popup.hideToday ? (
              <button onClick={() => closeToday(popup.id)} className="text-[13px] font-semibold hover:opacity-70" style={{ color: "#aaa" }}>
                오늘 다시보지않기
              </button>
            ) : (
              <span />
            )}
            <button onClick={() => close(popup.id)} className="text-[13px] font-bold px-4 py-1.5 rounded" style={{ background: "var(--brand)", color: "#fff" }}>
              닫기
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
