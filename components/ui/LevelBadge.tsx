"use client";

import { useLevelSettings } from "@/lib/useLevelSettings";

// 폴백 색상 (DB 설정 없을 때)
const FALLBACK_COLORS: { min: number; max: number; color: string; bg: string }[] = [
  { min: 0, max: 0, color: "#fff", bg: "#6b7280" },
  { min: 1, max: 9, color: "#fff", bg: "#22c55e" },
  { min: 10, max: 19, color: "#fff", bg: "#38bdf8" },
  { min: 20, max: 29, color: "#fff", bg: "#818cf8" },
  { min: 30, max: 39, color: "#fff", bg: "#f59e0b" },
  { min: 40, max: 49, color: "#fff", bg: "#ef4444" },
  { min: 50, max: 99, color: "#fff", bg: "#e11d48" },
  { min: 100, max: 999, color: "#fff", bg: "#7c3aed" },
];

function getFallbackColors(level: number): { color: string; bg: string } {
  for (const c of FALLBACK_COLORS) {
    if (level >= c.min && level <= c.max) return { color: c.color, bg: c.bg };
  }
  return { color: "#fff", bg: "#6b7280" };
}

interface Props {
  level: number;
  mode?: "badge" | "emoji" | "none";
  badge?: string;
}

export default function LevelBadge({ level, mode = "badge", badge }: Props) {
  const { settings } = useLevelSettings();

  if (mode === "none") return null;

  if (mode === "emoji" && badge) {
    if (badge.startsWith("/")) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={badge} alt="" className="w-4 h-4 object-contain inline-block mr-0.5" />;
    }
    return <span className="mr-0.5">{badge}</span>;
  }

  // DB에서 해당 레벨의 색상 찾기
  const setting = settings.find(s => s.level === level);
  const colors = setting?.color && setting?.bgColor
    ? { color: setting.color, bg: setting.bgColor }
    : getFallbackColors(level);

  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1"
      style={{ background: colors.bg, color: colors.color }}
    >
      Lv.{level}
    </span>
  );
}
