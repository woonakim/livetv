import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAMS = [
  { nameKr: "살라바트 Ufa", nameEn: "Salavat Yulaev", sport: "hockey", league: "KHL", logoPath: "/team-logos/KHL_e14e4b5de8ad1c72c6cef24ef9622cbe.png" },
  { nameKr: "VfL 볼프스부르크 (W)", nameEn: "VfL Wolfsburg Women", sport: "soccer", league: "분데스리가", logoPath: "/team-logos/bundesliga_c952d5f9072ca615f067865d264b7d84.png" },
  { nameKr: "파리", nameEn: "Paris Saint-Germain", sport: "soccer", league: "리그앙", logoPath: "/team-logos/ligue1_adfffaab83775d9afe91ce9d09a68f83.png" },
  { nameKr: "올랭피크 리옹 (W)", nameEn: "Olympique Lyonnais Women", sport: "soccer", league: "리그앙", logoPath: "/team-logos/ligue1_7878165f7be26cbc59f8e6abc79d700a.png" },
  { nameKr: "대한항공", nameEn: "Korean Air Jumbos", sport: "volleyball", league: "V리그(남)", logoPath: "/team-logos/kovo_vl_6fbb2b0598fd9071b03755aa4ac63cbc.png" },
  { nameKr: "현대캐피탈", nameEn: "Hyundai Capital Skywalkers", sport: "volleyball", league: "V리그(남)", logoPath: "/team-logos/kovo_vl_3f92ce591af7f140327b7b5e20ac9b37.png" },
  { nameKr: "대구 한국가스공사", nameEn: "Daegu Korea Gas", sport: "basketball", league: "KBL", logoPath: "/team-logos/kbl_84fe25bd2c662252ba218056335c7f23.png" },
  { nameKr: "삼성생명", nameEn: "Samsung Life Blueminx", sport: "basketball", league: "WKBL", logoPath: "/team-logos/wkbl_0e0dae49973311ce58c2817eb21441e3.png" },
  { nameKr: "우리은행", nameEn: "Woori Bank Wibee", sport: "basketball", league: "WKBL", logoPath: "/team-logos/wkbl_79d73350399183b2799b88086b5e012c.png" },
];

async function main() {
  let count = 0;
  for (const t of TEAMS) {
    await prisma.teamLogo.upsert({
      where: { nameKr: t.nameKr },
      create: t,
      update: { nameEn: t.nameEn, logoPath: t.logoPath, sport: t.sport, league: t.league },
    });
    count++;
  }
  console.log(`Done: ${count} upserted`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
