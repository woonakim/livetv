"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// 간단한 브라우저 fingerprint (canvas + screen + timezone)
function getFingerprint(): string {
  try {
    const parts = [
      navigator.userAgent,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.hardwareConcurrency || 0,
    ];
    // 간단 해시
    const str = parts.join("|");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  } catch {
    return "";
  }
}

export default function AccessTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    // 같은 경로 중복 전송 방지
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const fp = getFingerprint();

    fetch("/api/access-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "visit",
        path: pathname,
        referer: document.referrer || "",
        fingerprint: fp,
      }),
    }).catch(() => {}); // 실패해도 무시
  }, [pathname]);

  return null; // 렌더링 없음
}
