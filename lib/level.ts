// 레벨 범위별 색상
const LEVEL_COLORS: { min: number; max: number; bg: string; color: string }[] = [
  { min: 0, max: 0, bg: "#6b7280", color: "#fff" },     // 회색
  { min: 1, max: 9, bg: "#22c55e", color: "#fff" },      // 연두
  { min: 10, max: 19, bg: "#38bdf8", color: "#fff" },     // 하늘
  { min: 20, max: 29, bg: "#818cf8", color: "#fff" },     // 보라
  { min: 30, max: 39, bg: "#f59e0b", color: "#fff" },     // 주황
  { min: 40, max: 49, bg: "#ef4444", color: "#fff" },     // 빨강
  { min: 50, max: 99, bg: "#e11d48", color: "#fff" },     // 진빨강
  { min: 100, max: 999, bg: "#7c3aed", color: "#ffd700" }, // 보라+금
];

export function getLevelColor(level: number): { bg: string; color: string } {
  for (const c of LEVEL_COLORS) {
    if (level >= c.min && level <= c.max) return { bg: c.bg, color: c.color };
  }
  return { bg: "#6b7280", color: "#fff" };
}

export function calcLevel(exp: number, levelSettings: { level: number; requiredExp: number }[]): number {
  let result = 0;
  for (const s of levelSettings.sort((a, b) => a.level - b.level)) {
    if (exp >= s.requiredExp) result = s.level;
    else break;
  }
  return result;
}
