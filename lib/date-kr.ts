const KST_OFFSET = 9 * 60 * 60 * 1000;

// 한국 시간 기준 오늘 날짜의 YYYY-MM-DD 부분
function kstDateParts(): [number, number, number] {
  const kst = new Date(Date.now() + KST_OFFSET);
  return [kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()];
}

// ─── @db.Date 컬럼용 (날짜만 비교) ───
// Prisma @db.Date는 시간을 무시하고 날짜 부분만 비교
// KST 기준 오늘이 4/7이면 → new Date("2026-04-07") 반환
export function todayDateKST(): Date {
  const [y, m, d] = kstDateParts();
  return new Date(Date.UTC(y, m, d));
}

export function yesterdayDateKST(): Date {
  const t = todayDateKST();
  return new Date(t.getTime() - 24 * 60 * 60 * 1000);
}

// ─── DateTime 컬럼용 (시간 포함 비교) ───
// createdAt >= todayKST() 같은 범위 쿼리에 사용
// KST 4/7 00:00 = UTC 4/6 15:00
export function todayKST(): Date {
  const [y, m, d] = kstDateParts();
  return new Date(Date.UTC(y, m, d) - KST_OFFSET);
}

export function startOfMonthKST(): Date {
  const [y, m] = kstDateParts();
  return new Date(Date.UTC(y, m, 1) - KST_OFFSET);
}

export function endOfMonthKST(): Date {
  const [y, m] = kstDateParts();
  return new Date(Date.UTC(y, m + 1, 1) - KST_OFFSET - 1);
}

export function yesterdayKST(): Date {
  return new Date(todayKST().getTime() - 24 * 60 * 60 * 1000);
}

export function todayStringKST(): string {
  const [y, m, d] = kstDateParts();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
