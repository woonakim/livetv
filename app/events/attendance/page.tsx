"use client";

import { useState } from "react";

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function getCalendarDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const days: { day: number | null; isToday: boolean; isChecked: boolean; isPast: boolean }[] = [];

  for (let i = 0; i < firstDay; i++) days.push({ day: null, isToday: false, isChecked: false, isPast: false });

  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      isToday: d === today,
      isChecked: d < today,
      isPast: d < today,
    });
  }

  return { days, today, year, month: month + 1 };
}

const STREAK_REWARDS = [
  { days: 1, reward: "10P", label: "1일" },
  { days: 3, reward: "30P", label: "3일" },
  { days: 7, reward: "100P", label: "7일" },
  { days: 14, reward: "250P", label: "14일" },
  { days: 30, reward: "500P", label: "30일" },
];

export default function AttendancePage() {
  const { days, today, year, month } = getCalendarDays();
  const [checked, setChecked] = useState(false);
  const streak = today - 1;

  return (
    <>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📅</span>
            <div>
              <h1 className="text-xl font-black">출석 체크</h1>
              <p className="text-sm opacity-90">매일 출석하고 포인트를 적립하세요!</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black">{streak}일</p>
              <p className="text-xs opacity-75">연속 출석</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">{streak * 10}P</p>
              <p className="text-xs opacity-75">이번 달 적립</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">1,250P</p>
              <p className="text-xs opacity-75">총 보유 포인트</p>
            </div>
          </div>
        </div>

        {/* 오늘 출석 체크 버튼 */}
        {!checked ? (
          <button
            onClick={() => setChecked(true)}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-black text-lg rounded-2xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg hover:shadow-xl active:scale-95 transform"
          >
            📅 오늘 출석 체크하기 (+10P)
          </button>
        ) : (
          <div className="w-full py-4 bg-green-100 border-2 border-green-300 text-green-700 font-black text-lg rounded-2xl text-center">
            ✅ 오늘 출석 완료! +10P 적립되었습니다
          </div>
        )}

        {/* 달력 */}
        <div className="card p-4">
          <h2 className="section-title mb-4">
            {year}년 {month}월 출석 현황
          </h2>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((d, i) => (
              <div key={d} className={`text-center text-xs font-bold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => (
              <div
                key={i}
                className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all relative
                  ${!d.day ? "" : d.isToday ? "bg-sky-500 text-white shadow-md ring-2 ring-sky-300" : d.isChecked || (d.isToday && checked) ? "bg-sky-100 text-sky-700" : "text-slate-400 hover:bg-slate-50"}
                `}
              >
                {d.day && (
                  <>
                    <span>{d.day}</span>
                    {(d.isChecked || (d.isToday && checked)) && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px]">✓</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 연속 출석 보상 */}
        <div className="card p-4">
          <h2 className="section-title mb-4">🎁 연속 출석 보상</h2>
          <div className="grid grid-cols-5 gap-2">
            {STREAK_REWARDS.map((reward) => (
              <div
                key={reward.days}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all
                  ${streak >= reward.days
                    ? "border-sky-400 bg-sky-50"
                    : streak + 1 === reward.days
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-100 bg-slate-50"
                  }
                `}
              >
                <span className="text-xl">
                  {streak >= reward.days ? "✅" : streak + 1 === reward.days ? "🎁" : "🔒"}
                </span>
                <span className="text-xs font-bold text-slate-700">{reward.label}</span>
                <span className={`text-xs font-black ${streak >= reward.days ? "text-sky-600" : "text-slate-400"}`}>
                  {reward.reward}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 출석 랭킹 */}
        <div className="card p-4">
          <h2 className="section-title mb-3">🏆 이번 달 출석 랭킹</h2>
          <div className="space-y-2">
            {[
              { rank: 1, name: "출석왕", streak: 17, points: 170, badge: "🥇" },
              { rank: 2, name: "개근맨", streak: 16, points: 160, badge: "🥈" },
              { rank: 3, name: "매일매일", streak: 15, points: 150, badge: "🥉" },
              { rank: 4, name: "나", streak: streak, points: streak * 10, badge: "👤", isMe: true },
            ].map((user) => (
              <div
                key={user.rank}
                className={`flex items-center gap-3 p-2.5 rounded-xl ${(user as { isMe?: boolean }).isMe ? "bg-sky-50 border border-sky-200" : "hover:bg-slate-50"}`}
              >
                <span className="text-xl w-7 text-center">{user.badge}</span>
                <span className={`font-bold text-sm flex-1 ${(user as { isMe?: boolean }).isMe ? "text-sky-700" : "text-slate-800"}`}>
                  {user.name} {(user as { isMe?: boolean }).isMe && <span className="text-xs font-normal text-slate-500">(나)</span>}
                </span>
                <span className="text-xs text-slate-500">{user.streak}일 연속</span>
                <span className="text-xs font-bold text-sky-600">{user.points}P</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
