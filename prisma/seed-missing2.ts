import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();
const LOGO_DIR = "/root/livetv/public/team-logos";

const TEAMS = [
  // Soccer
  { nameKr: "CD 팔레스티노", nameEn: "Palestino", sport: "soccer", league: "Chile" },
  { nameKr: "SE 파우메이라스", nameEn: "Palmeiras", sport: "soccer", league: "Brasileirao" },
  { nameKr: "UD 라스팔마스", nameEn: "Las Palmas", sport: "soccer", league: "LaLiga" },
  { nameKr: "UD 알메리아", nameEn: "UD Almeria", sport: "soccer", league: "LaLiga2" },
  { nameKr: "CD 레가네스", nameEn: "CD Leganes", sport: "soccer", league: "LaLiga" },
  { nameKr: "SD 에이바르", nameEn: "SD Eibar", sport: "soccer", league: "LaLiga2" },
  { nameKr: "산투스 FC", nameEn: "Santos FC", sport: "soccer", league: "Brasileirao" },
  { nameKr: "카라보보 FC", nameEn: "Carabobo FC", sport: "soccer", league: "Venezuela" },
  { nameKr: "하과레스 데 코르도바", nameEn: "Belgrano", sport: "soccer", league: "Argentina" },
  { nameKr: "하포엘 텔-아비브", nameEn: "Hapoel Tel Aviv", sport: "basketball", league: "Euroleague" },
  { nameKr: "오페라리우 페호비아리우 EC", nameEn: "Operario Ferroviario", sport: "soccer", league: "Brasileirao" },
  // NPB
  { nameKr: "소프트뱅크", nameEn: "Fukuoka SoftBank Hawks", sport: "baseball", league: "NPB" },
  { nameKr: "오릭스", nameEn: "Orix Buffaloes", sport: "baseball", league: "NPB" },
  { nameKr: "라쿠텐", nameEn: "Tohoku Rakuten Golden Eagles", sport: "baseball", league: "NPB" },
  { nameKr: "세이부", nameEn: "Saitama Seibu Lions", sport: "baseball", league: "NPB" },
  // V-League (scoreboard logos)
  { nameKr: "GS칼텍스", nameEn: "GS Caltex Seoul KIXX", sport: "volleyball", league: "V리그(여)", logoPath: "/team-logos/kovo_wvl_535f431a47c459bf4bf46284b55bf2a2.png" },
  { nameKr: "한국도로공사", nameEn: "Korea Expressway Hi-pass", sport: "volleyball", league: "V리그(여)", logoPath: "/team-logos/kovo_wvl_11822468d5af7383e08a354a59e1fd30.png" },
  // KBL
  { nameKr: "수원 KT", nameEn: "Suwon KT Sonicboom", sport: "basketball", league: "KBL" },
  { nameKr: "창원 LG", nameEn: "Changwon LG Sakers", sport: "basketball", league: "KBL" },
  // CBA
  { nameKr: "랴오닝", nameEn: "Liaoning Flying Leopards", sport: "basketball", league: "CBA" },
  { nameKr: "베이징", nameEn: "Beijing Ducks", sport: "basketball", league: "CBA" },
  { nameKr: "상하이", nameEn: "Shanghai Sharks", sport: "basketball", league: "CBA" },
  { nameKr: "쓰촨", nameEn: "Sichuan Blue Whales", sport: "basketball", league: "CBA" },
  { nameKr: "저장 조주", nameEn: "Zhejiang Chouzhou", sport: "basketball", league: "CBA" },
  { nameKr: "지린", nameEn: "Jilin Northeast Tigers", sport: "basketball", league: "CBA" },
  { nameKr: "칭다오", nameEn: "Qingdao Eagles", sport: "basketball", league: "CBA" },
  { nameKr: "톈진", nameEn: "Tianjin Pioneers", sport: "basketball", league: "CBA" },
  { nameKr: "푸젠", nameEn: "Fujian Sturgeons", sport: "basketball", league: "CBA" },
];

async function main() {
  let count = 0;
  for (const t of TEAMS) {
    let logoPath = (t as { logoPath?: string }).logoPath;
    if (!logoPath) {
      const filename = t.nameKr.replace(/ /g, "_").replace(/\//g, "_") + ".png";
      const filepath = `${LOGO_DIR}/${filename}`;
      if (!fs.existsSync(filepath)) continue;
      logoPath = `/team-logos/${filename}`;
    }
    await prisma.teamLogo.upsert({
      where: { nameKr: t.nameKr },
      create: { nameKr: t.nameKr, nameEn: t.nameEn, sport: t.sport, league: t.league, logoPath },
      update: { nameEn: t.nameEn, logoPath, sport: t.sport, league: t.league },
    });
    count++;
  }
  console.log(`Done: ${count} upserted`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
