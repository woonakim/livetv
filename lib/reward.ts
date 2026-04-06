import { prisma } from "@/lib/prisma";

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

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          points: { increment: reward.points },
          exp: { increment: reward.exp },
        },
      }),
      prisma.pointLog.create({
        data: {
          userId,
          type: "EARN",
          amount: reward.points,
          reason: reason || `활동보상: ${reward.label}`,
        },
      }),
    ]);

    return { points: reward.points, exp: reward.exp };
  } catch (err) {
    console.error(`[reward] Failed to grant ${activityKey} to user ${userId}:`, err);
    return null;
  }
}
