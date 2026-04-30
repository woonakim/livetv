import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPORT_MAP: Record<string, string> = {
  "EPL": "soccer", "라리가": "soccer", "분데스리가": "soccer", "세리에A": "soccer",
  "리그앙": "soccer", "에레디비시": "soccer", "FIFA 랭킹": "soccer",
  "KBO": "baseball", "퓨처스": "baseball",
  "KBL": "basketball", "WKBL": "basketball", "NBA 동부": "basketball", "NBA 서부": "basketball",
  "V리그(남)": "volleyball", "V리그(여)": "volleyball",
  "NHL": "hockey", "KHL": "hockey",
};

async function main() {
  // standings API에서 전체 팀 가져오기
  const res = await fetch("http://localhost:3000/api/standings");
  const data = await res.json();
  const standings = data.standings || [];

  let created = 0;
  let skipped = 0;

  for (const s of standings) {
    const sport = SPORT_MAP[s.league] || s.sport || "";
    for (const t of s.teams) {
      if (!t.logo || !t.team) continue;

      const existing = await prisma.teamLogo.findUnique({ where: { nameKr_sport: { nameKr: t.team, sport } } });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.teamLogo.create({
        data: {
          nameKr: t.team,
          nameEn: "",
          sport,
          league: s.league,
          logoPath: t.logo,
        },
      });
      created++;
    }
  }

  console.log(`Done: ${created} created, ${skipped} skipped`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
