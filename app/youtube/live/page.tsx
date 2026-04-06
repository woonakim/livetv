"use client";

import { useState } from "react";

const LIVE_BJS = {
  sports: [
    { id: 1, name: "스포츠BJ_킹", sport: "⚽ 축구", viewers: 4231, title: "EPL 맨시티 vs 리버풀 같이 봐요!", isLive: true, tags: ["EPL", "축구", "라이브"] },
    { id: 2, name: "야구매니아", sport: "⚾ 야구", viewers: 2810, title: "KBO 두산 vs LG 실시간 시청 중", isLive: true, tags: ["KBO", "야구", "두산"] },
    { id: 3, name: "NBA팬클럽", sport: "🏀 농구", viewers: 1923, title: "NBA 레이커스 경기 같이 봐요", isLive: true, tags: ["NBA", "농구", "레이커스"] },
    { id: 4, name: "UFC매니아", sport: "🥊 UFC", viewers: 3120, title: "UFC 주말 메인카드 프리뷰", isLive: true, tags: ["UFC", "격투기"] },
    { id: 5, name: "롤챔스팬", sport: "🎮 E스포츠", viewers: 8401, title: "LCK 결승 T1 vs 젠지 같이봐요", isLive: true, tags: ["LCK", "롤", "T1"] },
    { id: 6, name: "배구여왕", sport: "🏐 배구", viewers: 892, title: "V리그 현대캐피탈 경기 시청", isLive: false, tags: ["V리그", "배구"] },
  ],
  casino: [
    { id: 11, name: "카지노킹", sport: "🎰 카지노", viewers: 12400, title: "바카라 실시간 - 오늘도 큰거 한방!", isLive: true, tags: ["바카라", "카지노", "라이브"] },
    { id: 12, name: "블랙잭여왕", sport: "🃏 블랙잭", viewers: 7830, title: "블랙잭 전략 공유 방송", isLive: true, tags: ["블랙잭", "전략"] },
    { id: 13, name: "룰렛마스터", sport: "🎡 룰렛", viewers: 5210, title: "유럽식 룰렛 실시간", isLive: true, tags: ["룰렛", "카지노"] },
    { id: 14, name: "슬롯머신왕", sport: "🎰 슬롯", viewers: 4120, title: "슬롯머신 대박 도전!", isLive: true, tags: ["슬롯", "카지노"] },
  ],
};

export default function LiveBroadcastPage() {
  const [activeTab, setActiveTab] = useState<"sports" | "casino">("sports");

  const currentList = LIVE_BJS[activeTab];

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-black text-slate-900">📡 라이브 방송</h1>
          <p className="text-sm text-slate-500 mt-1">BJ들의 실시간 스포츠 & 카지노 방송</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("sports")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${activeTab === "sports" ? "bg-sky-500 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-sky-50"}`}
          >
            🏆 스포츠 BJ
          </button>
          <button
            onClick={() => setActiveTab("casino")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${activeTab === "casino" ? "bg-sky-500 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-sky-50"}`}
          >
            🎰 카지노 BJ
          </button>
        </div>

        {/* BJ 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentList.map((bj) => (
            <div key={bj.id} className="card p-4 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                  {bj.sport.split(" ")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{bj.name}</span>
                    {bj.isLive ? (
                      <span className="badge-live text-[9px]">● LIVE</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">준비중</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate mb-2">{bj.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {bj.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-full border border-sky-100">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span>👁</span>
                    <span className="font-semibold">{bj.viewers.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              {bj.isLive && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <button className="w-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                    📺 시청하기
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
