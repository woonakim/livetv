export interface Grade {
  name: string;
  color: string;
  minExp: number;
  maxExp: number | null;
  icon: string;
}

export const GRADES: Grade[] = [
  { name: "새싹",    icon: "🌱", color: "#22c55e", minExp: 0,     maxExp: 99    },
  { name: "브론즈",  icon: "🥉", color: "#b45309", minExp: 100,   maxExp: 499   },
  { name: "실버",    icon: "🥈", color: "#6b7280", minExp: 500,   maxExp: 1499  },
  { name: "골드",    icon: "🥇", color: "#d97706", minExp: 1500,  maxExp: 3999  },
  { name: "플래티넘",icon: "💎", color: "#0ea5e9", minExp: 4000,  maxExp: 9999  },
  { name: "다이아",  icon: "👑", color: "#8b5cf6", minExp: 10000, maxExp: null  },
];

export function getGrade(exp: number): Grade {
  return [...GRADES].reverse().find(g => exp >= g.minExp) ?? GRADES[0];
}

export function getExpProgress(exp: number): { current: number; needed: number; percent: number } {
  const grade = getGrade(exp);
  const current = exp - grade.minExp;
  const needed = grade.maxExp !== null ? grade.maxExp - grade.minExp : 0;
  const percent = needed > 0 ? Math.min(100, Math.floor((current / needed) * 100)) : 100;
  return { current, needed, percent };
}
