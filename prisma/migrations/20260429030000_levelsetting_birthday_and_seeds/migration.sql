-- LevelSetting.birthdayBonusEnabled (per-level 생일 지급 체크박스)
ALTER TABLE "LevelSetting"
  ADD COLUMN IF NOT EXISTS "birthdayBonusEnabled" BOOLEAN NOT NULL DEFAULT false;

-- RegistrationSetting.requireBirthDate
ALTER TABLE "RegistrationSetting"
  ADD COLUMN IF NOT EXISTS "requireBirthDate" BOOLEAN NOT NULL DEFAULT false;

-- ActivityReward 시드 보완 — 신규 환경에서 silent failure 방지
INSERT INTO "ActivityReward" ("activityKey", "label", "points", "exp", "isActive", "updatedAt")
VALUES
  ('signup',         '회원가입 보상',     0, 0, false, NOW()),
  ('attendance',     '출석체크',          0, 0, false, NOW()),
  ('attendance_3',   '3일 연속 출석 보너스',  0, 0, false, NOW()),
  ('attendance_7',   '7일 연속 출석 보너스',  0, 0, false, NOW()),
  ('attendance_14',  '14일 연속 출석 보너스', 0, 0, false, NOW()),
  ('attendance_30',  '30일 연속 출석 보너스', 0, 0, false, NOW()),
  ('chat',           '채팅 보상',         0, 0, false, NOW()),
  ('event_join',     '이벤트 참여',       0, 0, false, NOW()),
  ('event_correct',  '이벤트 정답 보상',  0, 0, false, NOW()),
  ('analysis_write', '분석글 작성',       0, 0, false, NOW()),
  ('referral',       '추천인 보상',       0, 0, false, NOW()),
  ('post_write',     '게시글 작성',       0, 0, false, NOW()),
  ('comment_write',  '댓글 작성',         0, 0, false, NOW()),
  ('daily_login',    '매일 첫 로그인',    0, 0, false, NOW()),
  ('birthday',       '생일 축하 보상',    0, 0, false, NOW())
ON CONFLICT ("activityKey") DO NOTHING;
