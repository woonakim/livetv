"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

interface EventDetail {
  id: number;
  title: string;
  content: string;
  bannerImg: string;
  bottomImg: string;
  teamA: string;
  teamB: string;
  betType: string;
  reward: string;
  deadline: string;
  viewCount: number;
  createdAt: string;
  myPick: string | null;
  teamAVotes: number;
  teamBVotes: number;
  totalVotes: number;
}

function useCountdown(deadline: string) {
  const calc = useCallback(() => {
    const diff = Math.max(0, new Date(deadline).getTime() - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, expired: diff === 0 };
  }, [deadline]);

  const [time, setTime] = useState(calc);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setTime(calc());
    intervalRef.current = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(intervalRef.current);
  }, [calc]);

  return time;
}

export default function EventDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [voteError, setVoteError] = useState("");

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setEvent(data);
        if (data?.myPick) { setPick(data.myPick); setVoted(true); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const countdown = useCountdown(event?.deadline ?? new Date().toISOString());

  const handleVote = async () => {
    if (!pick || voted) return;
    setVoteError("");
    const res = await fetch(`/api/events/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pick }),
    });
    const data = await res.json();
    if (!res.ok) { setVoteError(data.error); return; }
    setVoted(true);
    if (event) {
      setEvent({
        ...event,
        myPick: pick,
        totalVotes: event.totalVotes + 1,
        teamAVotes: pick === "A" ? event.teamAVotes + 1 : event.teamAVotes,
        teamBVotes: pick === "B" ? event.teamBVotes + 1 : event.teamBVotes,
      });
    }
  };

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;
  if (!event) return (
    <div className="p-6 text-center" style={{ color: "var(--text-secondary)" }}>
      <p className="text-sm">이벤트를 찾을 수 없습니다.</p>
      <Link href="/events" className="text-xs font-bold mt-2 inline-block" style={{ color: "var(--brand)" }}>← 목록으로</Link>
    </div>
  );

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const pctA = event.totalVotes ? Math.round((event.teamAVotes / event.totalVotes) * 100) : 50;
  const pctB = event.totalVotes ? 100 - pctA : 50;

  return (
    <div className="flex flex-col w-full">
      {/* Title Header */}
      <div className="mx-2 mt-2">
        <header className="p-3 rounded-t-lg" style={{ background: "var(--surface)", borderBottom: "0" }}>
          <div className="font-semibold text-base mb-2 p-0.5" style={{ color: "var(--text-primary)" }}>
            {event.title}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[33px] h-[35px] flex justify-center items-center overflow-hidden rounded-full" style={{ background: "var(--brand)" }}>
              <span className="text-white text-xs font-bold">TV</span>
            </div>
            <div className="flex-grow flex justify-between items-center pr-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>라이브TV</div>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{formatDate(event.createdAt)}</span>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Main Body */}
      <main className="mx-2 mb-2 p-3 rounded-b-lg min-h-[200px]" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
        {/* Banner Image */}
        {event.bannerImg && (
          <div className="relative max-w-[570px] mx-auto mb-4">
            <img src={event.bannerImg} alt="Match Banner" className="w-full h-auto rounded-lg" />
            <div className="absolute inset-0 flex flex-wrap justify-center items-center px-12 pt-8 pb-24 text-center">
              <div className="text-[22px] sm:text-[27px] font-black leading-tight drop-shadow-lg" style={{ color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>
                🌠 라이브TV 이벤트 !!
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-1 py-4 leading-relaxed text-base space-y-0.5" style={{ color: "var(--text-primary)" }}>
          {event.content.split("\n").map((line, i) => (
            <p key={i}>{line || "\u00A0"}</p>
          ))}
        </div>

        {/* Bottom Image */}
        {event.bottomImg && (
          <div className="max-w-[370px] mx-auto mt-12 mb-8">
            <img src={event.bottomImg} alt="Bottom Banner" className="w-full h-auto rounded-lg" />
          </div>
        )}

        {/* Match Voting Area */}
        <div className="my-12 p-3 rounded-lg" style={{ background: "var(--surface)", boxShadow: "rgba(0,0,0,0.25) 0px 2px 4px 1px" }}>
          <ul className="max-w-[640px] mx-auto py-4">
            <li className="flex flex-wrap justify-center items-center gap-0">
              <div className="w-full text-[14.4px] px-2.5 pt-0.5 pb-1.5" style={{ color: "var(--text-primary)" }}>
                1.&nbsp;[{event.betType}]
              </div>
              <div className="flex w-full h-[65px] justify-center items-stretch overflow-hidden">
                {/* Team A */}
                <button
                  onClick={() => !voted && !countdown.expired && setPick("A")}
                  disabled={voted || countdown.expired}
                  className="flex-1 flex flex-col justify-center items-center text-sm font-semibold rounded-l-[10px] transition-colors"
                  style={{
                    border: pick === "A" ? "2px solid var(--brand)" : "1.5px solid var(--border)",
                    background: pick === "A" ? "rgba(255,140,0,0.08)" : "transparent",
                    color: pick === "A" ? "var(--brand)" : "var(--text-primary)",
                    cursor: voted || countdown.expired ? "default" : "pointer",
                  }}
                >
                  <span>{event.teamA}</span>
                  {voted && <span className="text-[10px] mt-0.5 font-bold">{pctA}%</span>}
                </button>

                {/* VS */}
                <div className="w-[56px] flex justify-center items-center text-sm font-semibold" style={{ background: "#d5d5d5", border: "1.5px solid #ccc", color: "#6d6d6d" }}>
                  VS
                </div>

                {/* Team B */}
                <button
                  onClick={() => !voted && !countdown.expired && setPick("B")}
                  disabled={voted || countdown.expired}
                  className="flex-1 flex flex-col justify-center items-center text-sm font-semibold rounded-r-[10px] transition-colors"
                  style={{
                    border: pick === "B" ? "2px solid var(--brand)" : "1.5px solid var(--border)",
                    background: pick === "B" ? "rgba(255,140,0,0.08)" : "transparent",
                    color: pick === "B" ? "var(--brand)" : "var(--text-primary)",
                    cursor: voted || countdown.expired ? "default" : "pointer",
                  }}
                >
                  <span>{event.teamB}</span>
                  {voted && <span className="text-[10px] mt-0.5 font-bold">{pctB}%</span>}
                </button>
              </div>
            </li>
          </ul>

          {/* 투표 결과 / 버튼 */}
          <div className="flex flex-col items-center mt-6 gap-2">
            {voted ? (
              <div className="w-full max-w-[472px] flex flex-col items-center gap-2">
                <div className="w-full h-10 flex justify-center items-center rounded text-white font-bold text-base" style={{ background: "#22c55e" }}>
                  ✅ 참여 중 — {pick === "A" ? event.teamA : event.teamB} 선택
                </div>
                <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  현재 {event.totalVotes}명 참여
                </span>
              </div>
            ) : countdown.expired ? (
              <div className="w-full max-w-[472px] h-10 flex justify-center items-center rounded font-bold text-base" style={{ background: "#94a3b8", color: "#fff" }}>
                투표 마감
              </div>
            ) : (
              <button
                onClick={handleVote}
                disabled={!pick}
                className="w-full max-w-[472px] h-10 flex justify-center items-center rounded text-white font-bold text-base transition-transform active:scale-95"
                style={{
                  background: pick ? "var(--brand)" : "#d4d4d4",
                  border: pick ? "1.5px solid var(--brand)" : "1.5px solid #d4d4d4",
                  cursor: pick ? "pointer" : "not-allowed",
                }}
              >
                투표하기
              </button>
            )}
            {voteError && <p className="text-xs text-red-500">{voteError}</p>}
          </div>
        </div>

        {/* Countdown */}
        <div className="max-w-[640px] mx-auto mt-20 mb-8 py-5 text-center">
          <div className="text-2xl font-normal mb-5" style={{ color: "var(--brand)" }}>
            마감까지 남은 시간
          </div>
          <div className="flex justify-center items-center flex-wrap gap-1.5">
            <span className="h-[46px] text-white text-[24px] font-semibold rounded-[5px] flex justify-center items-center px-5 py-2 whitespace-nowrap" style={{ background: "var(--text-primary)" }}>
              {String(countdown.h).padStart(2, "0")}시간
            </span>
            <span className="h-[46px] text-white text-[24px] font-semibold rounded-[5px] flex justify-center items-center px-5 py-2 whitespace-nowrap" style={{ background: "var(--text-primary)" }}>
              {String(countdown.m).padStart(2, "0")}분
            </span>
            <span className="h-[46px] text-white text-[24px] font-semibold rounded-[5px] flex justify-center items-center px-5 py-2 whitespace-nowrap" style={{ background: "var(--text-primary)" }}>
              {String(countdown.s).padStart(2, "0")}초
            </span>
          </div>
          <div className="mt-5 text-[15px] font-normal space-y-1" style={{ color: "var(--text-primary)" }}>
            <div>이벤트는 1인당 1회 참여 가능합니다.</div>
            <div>이벤트 참여 후 수정은 불가합니다.</div>
          </div>
        </div>
      </main>

      {/* 목록으로 */}
      <div className="mx-2 mb-4">
        <Link
          href="/events"
          className="flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-bold"
          style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          ← 목록으로
        </Link>
      </div>
    </div>
  );
}
