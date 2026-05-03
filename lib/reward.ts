import { prisma } from "@/lib/prisma";

// KST 기준 오늘 자정(00:00) Date 객체
function todayKstDateOnly(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  return new Date(Date.UTC(y, m, d));
}

/**
 * 채팅 보상 (일일 캡 + 글자수 + 중복 차단 적용)
 * SiteSetting의 chatRewardDailyPointCap/ExpCap, chatMinLength, chatMinLengthEnabled,
 * chatDuplicateBlockEnabled 설정을 따라 grant 여부와 지급량을 결정.
 *
 * 동시성:
 * - 캡: atomic increment + 사후 검증으로 race 시 약간의 over-cap 가능 (정책상 허용)
 * - 중복: chat/route.ts에서 INSERT 전 비교하여 처리
 */
export async function grantChatReward(userId: number, text: string): Promise<{ points: number; exp: number } | null> {
  try {
    const trimmed = text.trim();
    const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    if (!setting) return null;

    if (setting.chatMinLengthEnabled && trimmed.length < setting.chatMinLength) return null;

    const reward = await prisma.activityReward.findUnique({ where: { activityKey: "chat" } });
    if (!reward || !reward.isActive || (reward.points === 0 && reward.exp === 0)) return null;

    const today = todayKstDateOnly();
    const todayKey = today.toISOString().slice(0, 10);

    // 1) 새 날 시작이면 누적치 0으로 리셋 (atomic)
    await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [
          { chatRewardDate: null },
          { chatRewardDate: { lt: today } },
        ],
      },
      data: {
        chatRewardPoints: 0,
        chatRewardExp: 0,
        chatRewardDate: today,
      },
    });

    // 2) 현재 누적치 read
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { chatRewardPoints: true, chatRewardExp: true, chatRewardDate: true },
    });
    if (!u) return null;
    const sameDay = u.chatRewardDate?.toISOString().slice(0, 10) === todayKey;
    const accumPts = sameDay ? u.chatRewardPoints : 0;
    const accumExp = sameDay ? u.chatRewardExp : 0;

    const ptsCap = setting.chatRewardDailyPointCap;
    const expCap = setting.chatRewardDailyExpCap;
    const remainPts = ptsCap === 0 ? reward.points : Math.max(0, ptsCap - accumPts);
    const remainExp = expCap === 0 ? reward.exp : Math.max(0, expCap - accumExp);
    const grantPts = Math.min(reward.points, remainPts);
    const grantExp = Math.min(reward.exp, remainExp);
    if (grantPts === 0 && grantExp === 0) return null;

    // 3) atomic increment (race 시 약간 over-cap 가능하나, 단발성 + 차순 호출에서 캡 도달 검증)
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: grantPts },
        exp: { increment: grantExp },
        chatRewardPoints: { increment: grantPts },
        chatRewardExp: { increment: grantExp },
      },
      select: { points: true },
    });
    await prisma.pointLog.create({
      data: { userId, type: "EARN", amount: grantPts, reason: "채팅 보상", balance: updated.points },
    });
    return { points: grantPts, exp: grantExp };
  } catch (err) {
    console.error("[reward] grantChatReward failed:", err);
    return null;
  }
}

export { todayKstDateOnly };

/**
 * 활동 보상 지급
 * @param userId 유저 ID
 * @param activityKey 활동 키 (signup, attendance, chat, event_join, etc.)
 * @param reason 포인트 로그에 기록할 사유
 * @returns { points, exp } 지급된 보상 또는 null
 */
export async function grantReward(
  userId: number,
  activityKey: string,
  reason?: string
): Promise<{ points: number; exp: number } | null> {
  try {
    const reward = await prisma.activityReward.findUnique({
      where: { activityKey },
    });

    if (!reward || !reward.isActive || (reward.points === 0 && reward.exp === 0)) {
      return null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: reward.points },
        exp: { increment: reward.exp },
      },
      select: { points: true },
    });
    await prisma.pointLog.create({
      data: {
        userId,
        type: "EARN",
        amount: reward.points,
        reason: reason || `활동보상: ${reward.label}`,
        balance: updated.points,
      },
    });

    return { points: reward.points, exp: reward.exp };
  } catch (err) {
    console.error(`[reward] Failed to grant ${activityKey} to user ${userId}:`, err);
    return null;
  }
}
