"use client";

import { useState, useEffect } from "react";

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function getCalendarDays(checkedDates: Set<string>) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const days: { day: number | null; isToday: boolean; isChecked: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) days.push({ day: null, isToday: false, isChecked: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ day: d, isToday: d === today, isChecked: checkedDates.has(dateStr) });
  }
  return { days, today, year, month: month + 1 };
}

interface RewardInfo { points: number; exp: number }

const STREAK_MILESTONES = [
  { days: 1, key: "attendance", label: "매일" },
  { days: 3, key: "attendance_3", label: "3일" },
  { days: 7, key: "attendance_7", label: "7일" },
  { days: 14, key: "attendance_14", label: "14일" },
  { days: 30, key: "attendance_30", label: "30일" },
];

export default function AttendancePage() {
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  const [todayChecked, setTodayChecked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalExp, setTotalExp] = useState(0);
  const [rewards, setRewards] = useState<Record<string, RewardInfo>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ points: number; exp: number; bonusPoints: number; bonusExp: number; streak: number } | null>(null);

  useEffect(() => {
    fetch("/api/attendance")
      .then(r => r.json())
      .then(data => {
        const dates = new Set<string>((data.records || []).map((r: { date: string }) => r.date));
        setCheckedDates(dates);
        setStreak(data.currentStreak || 0);
        setTotalPoints(data.totalPoints || 0);
        setTotalExp(data.totalExp || 0);
        setRewards(data.rewards || {});
        const today = new Date().toISOString().slice(0, 10);
        setTodayChecked(dates.has(today));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { days, year, month } = getCalendarDays(checkedDates);
  const monthCheckedCount = checkedDates.size;
  const dailyReward = rewards["attendance"] || { points: 0, exp: 0 };

  const handleCheck = async () => {
    if (checking || todayChecked) return;
    setChecking(true);
    try {
      const res = await fetch("/api/attendance", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTodayChecked(true);
        setStreak(data.streak);
        setResult(data);
        const today = new Date().toISOString().slice(0, 10);
        setCheckedDates(prev => { const next = new Set(Array.from(prev)); next.add(today); return next; });
        setTotalPoints(prev => prev + (data.points || 0) + (data.bonusPoints || 0));
        setTotalExp(prev => prev + (data.exp || 0) + (data.bonusExp || 0));
      } else {
        alert(data.error || "출석 실패");
      }
    } catch { alert("네트워크 오류"); }
    finally { setChecking(false); }
  };

  if (loading) {
    return <div className="p-6 text-center"><div className="w-8 h-8 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} /></div>;
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">📅</span>
          <div>
            <h1 className="text-xl font-black">출석 체크</h1>
            <p className="text-sm opacity-90">매일 출석하고 포인트와 경험치를 적립하세요!</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-2xl font-black">{streak}일</p>
            <p className="text-xs opacity-75">연속 출석</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{monthCheckedCount}일</p>
            <p className="text-xs opacity-75">이번 달</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{totalPoints.toLocaleString()}P</p>
            <p className="text-xs opacity-75">보유 포인트</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{totalExp.toLocaleString()}</p>
            <p className="text-xs opacity-75">경험치</p>
          </div>
        </div>
      </div>

      {/* 출석 버튼 */}
      {!todayChecked ? (
        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full py-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-black text-lg rounded-2xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg active:scale-95 transform"
          style={{ opacity: checking ? 0.7 : 1 }}
        >
          {checking ? "출석 중..." : `📅 오늘 출석 체크하기 (+${dailyReward.points}P / +${dailyReward.exp}EXP)`}
        </button>
      ) : (
        <div className="w-full py-4 text-center rounded-2xl font-bold" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--text-primary)" }}>✅ 오늘 출석 완료!</p>
          {result && (
            <p className="text-sm mt-1" style={{ color: "var(--brand)" }}>
              +{result.points}P / +{result.exp}EXP (연속 {result.streak}일)
              {result.bonusPoints > 0 && (
                <span className="ml-2 text-amber-500 font-black">🎉 보너스 +{result.bonusPoints}P / +{result.bonusExp}EXP</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* 연속 출석 보상표 */}
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 py-2" style={{ background: "var(--brand)" }}>
          <h2 className="text-sm font-bold text-white">🎁 연속 출석 보상</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="px-3 py-2 text-left text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>연속 출석</th>
              <th className="px-3 py-2 text-center text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>포인트</th>
              <th className="px-3 py-2 text-center text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>경험치</th>
              <th className="px-3 py-2 text-center text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>달성</th>
            </tr>
          </thead>
          <tbody>
            {STREAK_MILESTONES.map((m, idx) => {
              const r = rewards[m.key] || { points: 0, exp: 0 };
              const achieved = m.days === 1 ? todayChecked : streak >= m.days;
              return (
                <tr key={m.key} style={{ borderTop: "1px solid var(--border)", background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)" }}>
                  <td className="px-3 py-2.5 font-bold" style={{ color: "var(--text-primary)" }}>
                    {m.days === 1 ? "매일 출석" : `${m.days}일 연속`}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--brand)" }}>
                    +{r.points.toLocaleString()}P
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "#8b5cf6" }}>
                    +{r.exp.toLocaleString()}EXP
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {achieved ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#16a34a" }}>달성 ✓</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>미달성</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 달력 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>📅 {year}년 {month}월 출석 현황</h2>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-[10px] font-bold py-1" style={{ color: "var(--text-secondary)" }}>{d}</div>
          ))}
          {days.map((d, i) => (
            <div
              key={i}
              className="aspect-square flex items-center justify-center rounded-lg text-[12px] font-bold"
              style={{
                background: d.isToday ? "var(--brand)" : d.isChecked ? "rgba(14,165,233,0.15)" : "transparent",
                color: d.isToday ? "#fff" : d.isChecked ? "var(--brand)" : d.day ? "var(--text-primary)" : "transparent",
              }}
            >
              {d.day && (
                <div className="relative flex items-center justify-center w-full h-full">
                  <span>{d.day}</span>
                  {d.isChecked && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src="/cs_ok.png" alt="출석" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
