import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAMS = [
  // KBO
  { nameKr: "LG", nameEn: "LG Twins", sport: "baseball", league: "KBO", logoPath: "/team-logos/LG.png" },
  { nameKr: "KIA", nameEn: "Kia Tigers", sport: "baseball", league: "KBO", logoPath: "/team-logos/KIA.png" },
  { nameKr: "KT", nameEn: "KT Wiz", sport: "baseball", league: "KBO", logoPath: "/team-logos/KT.png" },
  { nameKr: "NC", nameEn: "NC Dinos", sport: "baseball", league: "KBO", logoPath: "/team-logos/NC.png" },
  { nameKr: "SSG", nameEn: "SSG Landers", sport: "baseball", league: "KBO", logoPath: "/team-logos/SSG.png" },
  { nameKr: "두산", nameEn: "Doosan Bears", sport: "baseball", league: "KBO", logoPath: "/team-logos/두산.png" },
  { nameKr: "롯데", nameEn: "Lotte Giants", sport: "baseball", league: "KBO", logoPath: "/team-logos/롯데.png" },
  { nameKr: "삼성", nameEn: "Samsung Lions", sport: "baseball", league: "KBO", logoPath: "/team-logos/삼성.png" },
  { nameKr: "한화", nameEn: "Hanwha Eagles", sport: "baseball", league: "KBO", logoPath: "/team-logos/한화.png" },
  { nameKr: "키움", nameEn: "Kiwoom Heroes", sport: "baseball", league: "KBO", logoPath: "/team-logos/키움.png" },
  // NPB
  { nameKr: "야쿠르트", nameEn: "Tokyo Yakult Swallows", sport: "baseball", league: "NPB", logoPath: "/team-logos/야쿠르트.png" },
  { nameKr: "요미우리", nameEn: "Yomiuri Giants", sport: "baseball", league: "NPB", logoPath: "/team-logos/요미우리.png" },
  { nameKr: "요코하마", nameEn: "Yokohama DeNA BayStars", sport: "baseball", league: "NPB", logoPath: "/team-logos/요코하마.png" },
  { nameKr: "한신", nameEn: "Hanshin Tigers", sport: "baseball", league: "NPB", logoPath: "/team-logos/한신.png" },
  { nameKr: "히로시마", nameEn: "Hiroshima Toyo Carp", sport: "baseball", league: "NPB", logoPath: "/team-logos/히로시마.png" },
  { nameKr: "주니치", nameEn: "Chunichi Dragons", sport: "baseball", league: "NPB", logoPath: "/team-logos/주니치.png" },
  { nameKr: "닛폰햄", nameEn: "Hokkaido Nippon-Ham Fighters", sport: "baseball", league: "NPB", logoPath: "/team-logos/닛폰햄.png" },
  { nameKr: "지바롯데", nameEn: "Chiba Lotte Marines", sport: "baseball", league: "NPB", logoPath: "/team-logos/지바롯데.png" },
  // MLB
  { nameKr: "뉴욕메츠", nameEn: "New York Mets", sport: "baseball", league: "MLB", logoPath: "/team-logos/뉴욕메츠.png" },
  { nameKr: "디트로이트", nameEn: "Detroit Tigers", sport: "baseball", league: "MLB", logoPath: "/team-logos/디트로이트.png" },
  { nameKr: "애틀랜타", nameEn: "Atlanta Braves", sport: "baseball", league: "MLB", logoPath: "/team-logos/애틀랜타.png" },
  { nameKr: "샌프란시스코", nameEn: "San Francisco Giants", sport: "baseball", league: "MLB", logoPath: "/team-logos/샌프란시스코.png" },
  { nameKr: "애리조나", nameEn: "Arizona Diamondbacks", sport: "baseball", league: "MLB", logoPath: "/team-logos/애리조나.png" },
  { nameKr: "미네소타", nameEn: "Minnesota Twins", sport: "baseball", league: "MLB", logoPath: "/team-logos/미네소타.png" },
  { nameKr: "캔자스시티", nameEn: "Kansas City Royals", sport: "baseball", league: "MLB", logoPath: "/team-logos/캔자스시티.png" },
  // NBA
  { nameKr: "LA레이커스", nameEn: "Los Angeles Lakers", sport: "basketball", league: "NBA", logoPath: "/team-logos/LA레이커스.png" },
  { nameKr: "LA클리퍼스", nameEn: "LA Clippers", sport: "basketball", league: "NBA", logoPath: "/team-logos/LA클리퍼스.png" },
  { nameKr: "골든스테이트", nameEn: "Golden State Warriors", sport: "basketball", league: "NBA", logoPath: "/team-logos/골든스테이트.png" },
  { nameKr: "뉴올리언즈", nameEn: "New Orleans Pelicans", sport: "basketball", league: "NBA", logoPath: "/team-logos/뉴올리언즈.png" },
  { nameKr: "샌안토니오", nameEn: "San Antonio Spurs", sport: "basketball", league: "NBA", logoPath: "/team-logos/샌안토니오.png" },
  { nameKr: "오클라호마", nameEn: "Oklahoma City Thunder", sport: "basketball", league: "NBA", logoPath: "/team-logos/오클라호마.png" },
  { nameKr: "포틀랜드", nameEn: "Portland Trail Blazers", sport: "basketball", league: "NBA", logoPath: "/team-logos/포틀랜드.png" },
  { nameKr: "피닉스", nameEn: "Phoenix Suns", sport: "basketball", league: "NBA", logoPath: "/team-logos/피닉스.png" },
  { nameKr: "샬럿", nameEn: "Charlotte Hornets", sport: "basketball", league: "NBA", logoPath: "/team-logos/샬럿.png" },
  { nameKr: "클리블랜드", nameEn: "Cleveland Cavaliers", sport: "basketball", league: "NBA", logoPath: "/team-logos/클리블랜드.png" },
  { nameKr: "유타 매머드", nameEn: "Utah Jazz", sport: "basketball", league: "NBA", logoPath: "/team-logos/유타_매머드.png" },
  // Soccer
  { nameKr: "바르셀로나", nameEn: "FC Barcelona", sport: "soccer", league: "LaLiga", logoPath: "/team-logos/바르셀로나.png" },
  { nameKr: "모나코", nameEn: "AS Monaco", sport: "soccer", league: "Ligue1", logoPath: "/team-logos/모나코.png" },
  { nameKr: "그라나다 CF", nameEn: "Granada CF", sport: "soccer", league: "LaLiga", logoPath: "/team-logos/그라나다_CF.png" },
  // V-League
  { nameKr: "고양 소노", nameEn: "Goyang Sono", sport: "volleyball", league: "V-League", logoPath: "/team-logos/고양_소노.png" },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const team of TEAMS) {
    const exists = await prisma.teamLogo.findUnique({ where: { nameKr_sport: { nameKr: team.nameKr, sport: team.sport } } });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.teamLogo.create({ data: team });
    created++;
  }
  console.log(`Seed done: ${created} created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
