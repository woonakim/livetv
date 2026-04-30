-- User 컬럼 추가
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "birthDate" DATE,
  ADD COLUMN IF NOT EXISTS "lastDailyLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastBirthdayBonusYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "eventStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "eventBestStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chatRewardPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chatRewardExp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chatRewardDate" DATE,
  ADD COLUMN IF NOT EXISTS "analysisRewardCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "analysisRewardDate" DATE;

-- SiteSetting 컬럼 추가
ALTER TABLE "SiteSetting"
  ADD COLUMN IF NOT EXISTS "collectBirthDateOnSignup" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "collectPhoneOnSignup"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "birthdayBonusEnabled"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "birthdayMinLevel"         INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "exchangeMinLevel"         INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "exchangeLockEnabled"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "allowUserAnalysis"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "analysisRewardDailyLimit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "chatRewardDailyPointCap"  INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "chatRewardDailyExpCap"    INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "chatMinLength"            INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "chatMinLengthEnabled"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "chatDuplicateBlockEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Event/EventVote 정산 컬럼
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "winnerSide" TEXT,
  ADD COLUMN IF NOT EXISTS "settledAt"  TIMESTAMP(3);

ALTER TABLE "EventVote"
  ADD COLUMN IF NOT EXISTS "isCorrect" BOOLEAN;

-- 연승 보상 가변 테이블
CREATE TABLE IF NOT EXISTS "EventStreakSetting" (
  "id"        SERIAL PRIMARY KEY,
  "threshold" INTEGER NOT NULL,
  "points"    INTEGER NOT NULL DEFAULT 0,
  "exp"       INTEGER NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "EventStreakSetting_threshold_key" ON "EventStreakSetting"("threshold");

-- ActivityReward 시드 (daily_login, birthday)
INSERT INTO "ActivityReward" ("activityKey", "label", "points", "exp", "isActive", "updatedAt")
VALUES
  ('daily_login', '매일 첫 로그인', 0, 0, false, NOW()),
  ('birthday',    '생일 축하 보상', 0, 0, false, NOW())
ON CONFLICT ("activityKey") DO NOTHING;
