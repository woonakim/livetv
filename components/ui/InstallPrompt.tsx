"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Service Worker 등록
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 이미 설치됨 or 이미 닫음
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("a2hs_dismissed");
    if (isStandalone || dismissed) return;

    // iOS 체크
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
      // iOS는 beforeinstallprompt 미지원 → 가이드 배너
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // PC: 즐겨찾기 유도 배너
    const isPC = window.innerWidth >= 1024;
    if (isPC) {
      setTimeout(() => setShowBanner(true), 2000);
    }

    // Android/Chrome: beforeinstallprompt 이벤트 캐치
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    // Android/Chrome: 네이티브 설치 프롬프트
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowBanner(false);
      setDeferredPrompt(null);
      return;
    }
    // iOS: 이미지 가이드 모달
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    // 최종 폴백: URL 복사
    await navigator.clipboard.writeText(window.location.origin);
    alert("링크가 복사되었습니다. 브라우저 메뉴에서 '홈 화면에 추가'를 선택해주세요.");
  }, [deferredPrompt, isIOS]);

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("a2hs_dismissed", "1");
  };

  const handleBookmark = () => {
    alert("Ctrl + D 를 눌러 즐겨찾기에 추가해주세요!");
  };

  if (!showBanner) return null;

  return (
    <>
      {/* PC 즐겨찾기 유도 배너 */}
      <div
        className="fixed bottom-6 right-6 z-[9998] rounded-xl p-4 shadow-xl hidden lg:flex items-center gap-3 animate-fade-in"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxWidth: 340 }}
      >
        <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "var(--brand)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo_background_transparency.png" alt="" className="w-9 h-9 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
            즐겨찾기에 추가하세요
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>D</kbd> 로 빠르게 접속하세요
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            닫기
          </button>
          <button
            onClick={handleBookmark}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "var(--brand)" }}
          >
            추가
          </button>
        </div>
      </div>

      {/* 모바일 홈화면 추가 배너 */}
      <div
        className="fixed bottom-[64px] left-2 right-2 z-[9998] rounded-xl p-3 flex items-center gap-3 shadow-xl lg:hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* 아이콘 */}
        <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "var(--brand)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo_background_transparency.png" alt="" className="w-9 h-9 object-contain" />
        </div>
        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
            홈 화면에 추가
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            바로가기를 추가하면 앱처럼 사용할 수 있어요
          </p>
        </div>
        {/* 버튼 */}
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            닫기
          </button>
          <button
            onClick={handleInstall}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "var(--brand)" }}
          >
            추가
          </button>
        </div>
      </div>

      {/* iOS 가이드 모달 — 이미지 가이드 */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[9999] flex flex-col lg:hidden" onClick={handleDismiss}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.85)" }} />
          <div className="relative flex-1 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "rgba(0,0,0,0.5)" }}>
              <span className="text-[14px] font-bold text-white">홈 화면에 추가 가이드</span>
              <button onClick={handleDismiss} className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white" style={{ background: "rgba(255,255,255,0.1)" }}>✕</button>
            </div>
            {/* 이미지 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/guide/ios-install-guide.png" alt="홈 화면 추가 가이드" className="w-full" style={{ maxWidth: 500, margin: "0 auto", display: "block" }} />
            </div>
            {/* 하단 버튼 */}
            <div className="px-4 py-3 shrink-0" style={{ background: "rgba(0,0,0,0.5)" }}>
              <button onClick={handleDismiss} className="w-full py-3 rounded-xl text-[14px] font-bold text-white" style={{ background: "var(--brand)" }}>
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
