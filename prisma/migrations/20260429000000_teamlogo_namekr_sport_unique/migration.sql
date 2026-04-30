-- TeamLogo.nameKr 단일 unique → (nameKr, sport) 복합 unique
DROP INDEX IF EXISTS "TeamLogo_nameKr_key";
CREATE UNIQUE INDEX "TeamLogo_nameKr_sport_key" ON "TeamLogo"("nameKr", "sport");
