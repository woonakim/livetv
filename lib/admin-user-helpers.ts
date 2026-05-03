import { prisma } from "@/lib/prisma";

// 레벨 계산
export async function calculateLevel(exp: number): Promise<{ level: number; name: string; badge: string; color: string; bgColor: string; nextRequired: number | null; toNext: number | null }> {
  const levels = await prisma.levelSetting.findMany({ orderBy: { level: "asc" } });
  let current = { level: 0, name: "", badge: "", color: "", bgColor: "", requiredExp: 0 };
  let next: { level: number; requiredExp: number } | null = null;
  for (let i = 0; i < levels.length; i++) {
    if (exp >= levels[i].requiredExp) current = levels[i];
    else { next = levels[i]; break; }
  }
  return {
    level: current.level,
    name: current.name,
    badge: current.badge,
    color: current.color,
    bgColor: current.bgColor,
    nextRequired: next ? next.requiredExp : null,
    toNext: next ? next.requiredExp - exp : null,
  };
}

// 다중 계정 의심 점수 (0~100)
export async function calculateSuspicionScore(userId: number): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, createdAt: true, phoneVerified: true, referredBy: true, isActive: true },
  });
  if (!user) return { score: 0, reasons: ["unknown user"] };

  // 1. 같은 IP를 사용한 다른 회원 수
  const myIps = await prisma.accessLog.findMany({
    where: { userId, ip: { not: "" } },
    select: { ip: true },
    distinct: ["ip"],
    take: 30,
  });
  const ipList = myIps.map(x => x.ip).filter(Boolean);
  if (ipList.length > 0) {
    const dupes = await prisma.accessLog.findMany({
      where: { ip: { in: ipList }, userId: { not: null, notIn: [userId] } },
      select: { userId: true },
      distinct: ["userId"],
      take: 50,
    });
    const otherCount = dupes.length;
    if (otherCount >= 5) { score += 30; reasons.push(`같은 IP 사용 다른 계정 ${otherCount}개`); }
    else if (otherCount >= 2) { score += 15; reasons.push(`같은 IP 사용 다른 계정 ${otherCount}개`); }
    else if (otherCount >= 1) { score += 5; reasons.push(`같은 IP 사용 다른 계정 1개`); }
  }

  // 2. 휴대폰 미인증
  if (!user.phoneVerified) { score += 10; reasons.push("전화 미인증"); }

  // 3. 계정이 매우 신규
  const ageH = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageH < 24) { score += 10; reasons.push("가입 24시간 이내"); }

  // 4. 같은 추천인 가입자가 단시간 내 다수
  if (user.referredBy) {
    const sameRef = await prisma.user.findMany({
      where: {
        referredBy: user.referredBy,
        createdAt: { gte: new Date(user.createdAt.getTime() - 24 * 3600 * 1000), lte: new Date(user.createdAt.getTime() + 24 * 3600 * 1000) },
        id: { not: userId },
      },
      select: { id: true },
      take: 20,
    });
    if (sameRef.length >= 5) { score += 20; reasons.push(`같은 추천인 24시간내 가입 ${sameRef.length}명`); }
    else if (sameRef.length >= 2) { score += 10; reasons.push(`같은 추천인 24시간내 가입 ${sameRef.length}명`); }
  }

  // 5. 비활성 계정
  if (!user.isActive) { score += 5; reasons.push("비활성 계정"); }

  // 6. UA가 같은 다른 계정
  const myUAs = await prisma.accessLog.findMany({
    where: { userId, userAgent: { not: "" } },
    select: { userAgent: true },
    distinct: ["userAgent"],
    take: 5,
  });
  const uaList = myUAs.map(x => x.userAgent).filter(Boolean);
  if (uaList.length > 0) {
    const dupUA = await prisma.accessLog.findMany({
      where: { userAgent: { in: uaList }, userId: { not: null, notIn: [userId] } },
      select: { userId: true },
      distinct: ["userId"],
      take: 30,
    });
    if (dupUA.length >= 3) { score += 10; reasons.push(`같은 UA 다른 계정 ${dupUA.length}개`); }
  }

  return { score: Math.min(100, score), reasons };
}

// 추천 피라미드: 상위 체인 + 하위 체인
export async function getReferralPyramid(userId: number): Promise<{
  upChain: { id: number; nickname: string; role: string; createdAt: string; isActive: boolean }[];
  downChildren: { id: number; nickname: string; role: string; createdAt: string; isActive: boolean; childCount: number }[];
}> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, referredBy: true } });
  if (!me) return { upChain: [], downChildren: [] };

  // 상위: referredBy → 그 사용자 → 그 사용자의 referredBy ... 최대 5단계
  const upChain: { id: number; nickname: string; role: string; createdAt: string; isActive: boolean }[] = [];
  let cur = me.referredBy;
  const visited = new Set<string>();
  for (let i = 0; i < 5 && cur && !visited.has(cur); i++) {
    visited.add(cur);
    const u: { id: number; nickname: string; role: string; createdAt: Date; isActive: boolean; referredBy: string | null } | null =
      await prisma.user.findUnique({
        where: { nickname: cur },
        select: { id: true, nickname: true, role: true, createdAt: true, isActive: true, referredBy: true },
      });
    if (!u) break;
    upChain.push({ id: u.id, nickname: u.nickname, role: u.role, createdAt: u.createdAt.toISOString(), isActive: u.isActive });
    cur = u.referredBy;
  }

  // 하위: 이 회원의 닉네임을 referredBy로 가진 회원들 (1depth) + 각 child의 child count
  const direct = await prisma.user.findMany({
    where: { referredBy: me.nickname },
    select: { id: true, nickname: true, role: true, createdAt: true, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const downChildren = await Promise.all(direct.map(async (c) => {
    const childCount = await prisma.user.count({ where: { referredBy: c.nickname } });
    return { id: c.id, nickname: c.nickname, role: c.role, createdAt: c.createdAt.toISOString(), isActive: c.isActive, childCount };
  }));

  return { upChain, downChildren };
}
