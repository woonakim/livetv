"use client";

import { useEffect, useState } from "react";

export default function NoticeTicker({ className, textClass }: { className?: string; textClass?: string }) {
  const [ticker, setTicker] = useState("");

  useEffect(() => {
    fetch("/api/site-settings")
      .then(r => r.json())
      .then(d => setTicker(d.noticeTicker || ""))
      .catch(() => {});
  }, []);

  if (!ticker) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 w-full overflow-hidden">
        <i className="fas fa-bullhorn text-xs shrink-0" style={{ color: "var(--brand)" }} />
        <div className="overflow-hidden flex-grow relative h-full flex items-center">
          <div className={`scrolling-text ${textClass || "text-xs font-bold"}`} style={{ color: "var(--text-primary)" }}>
            {ticker}
          </div>
        </div>
      </div>
    </div>
  );
}
