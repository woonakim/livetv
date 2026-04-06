import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();
const LOGO_DIR = "/root/livetv/public/team-logos";

const NEW_TEAMS = [
  // NHL
  { nameKr: "LA 킹스", nameEn: "Los Angeles Kings", sport: "hockey", league: "NHL" },
  { nameKr: "내쉬빌 프레데터스", nameEn: "Nashville Predators", sport: "hockey", league: "NHL" },
  { nameKr: "뉴욕 레인저스", nameEn: "New York Rangers", sport: "hockey", league: "NHL" },
  { nameKr: "뉴저지 데빌스", nameEn: "New Jersey Devils", sport: "hockey", league: "NHL" },
  { nameKr: "댈러스 스타스", nameEn: "Dallas Stars", sport: "hockey", league: "NHL" },
  { nameKr: "디트로이트 레드윙스", nameEn: "Detroit Red Wings", sport: "hockey", league: "NHL" },
  { nameKr: "몬트리올 커내이디안스", nameEn: "Montreal Canadiens", sport: "hockey", league: "NHL" },
  { nameKr: "미네소타 와일드", nameEn: "Minnesota Wild", sport: "hockey", league: "NHL" },
  { nameKr: "밴쿠버 커넉스", nameEn: "Vancouver Canucks", sport: "hockey", league: "NHL" },
  { nameKr: "버팔로 세이버스", nameEn: "Buffalo Sabres", sport: "hockey", league: "NHL" },
  { nameKr: "베가스 골든나이츠", nameEn: "Vegas Golden Knights", sport: "hockey", league: "NHL" },
  { nameKr: "보스턴 브루인스", nameEn: "Boston Bruins", sport: "hockey", league: "NHL" },
  { nameKr: "산호세 샤크스", nameEn: "San Jose Sharks", sport: "hockey", league: "NHL" },
  { nameKr: "시애틀 크라켄", nameEn: "Seattle Kraken", sport: "hockey", league: "NHL" },
  { nameKr: "시카고 블랙호크스", nameEn: "Chicago Blackhawks", sport: "hockey", league: "NHL" },
  { nameKr: "애드먼턴 오일러스", nameEn: "Edmonton Oilers", sport: "hockey", league: "NHL" },
  { nameKr: "오타와 세너터스", nameEn: "Ottawa Senators", sport: "hockey", league: "NHL" },
  { nameKr: "워싱턴 캐피탈스", nameEn: "Washington Capitals", sport: "hockey", league: "NHL" },
  { nameKr: "위니펙 제츠", nameEn: "Winnipeg Jets", sport: "hockey", league: "NHL" },
  { nameKr: "캐롤라이나 허리케인스", nameEn: "Carolina Hurricanes", sport: "hockey", league: "NHL" },
  { nameKr: "캘거리 플레임스", nameEn: "Calgary Flames", sport: "hockey", league: "NHL" },
  { nameKr: "콜럼버스 블루재키츠", nameEn: "Columbus Blue Jackets", sport: "hockey", league: "NHL" },
  { nameKr: "템파베이 라이트닝", nameEn: "Tampa Bay Lightning", sport: "hockey", league: "NHL" },
  { nameKr: "토론토 메이플리프스", nameEn: "Toronto Maple Leafs", sport: "hockey", league: "NHL" },
  { nameKr: "플로리다 팬서스", nameEn: "Florida Panthers", sport: "hockey", league: "NHL" },
  { nameKr: "피츠버그 펭귄스", nameEn: "Pittsburgh Penguins", sport: "hockey", league: "NHL" },
  { nameKr: "필라델피아 플라이어스", nameEn: "Philadelphia Flyers", sport: "hockey", league: "NHL" },
  // Soccer
  { nameKr: "CD 카스테욘", nameEn: "CD Castellon", sport: "soccer", league: "LaLiga2" },
  { nameKr: "레알 사라고사", nameEn: "Real Zaragoza", sport: "soccer", league: "LaLiga2" },
  { nameKr: "레알 소시에다드 B", nameEn: "Real Sociedad B", sport: "soccer", league: "LaLiga2" },
  { nameKr: "FC 바르셀로나 (W)", nameEn: "FC Barcelona Women", sport: "soccer", league: "LaLiga" },
  { nameKr: "CR 플라멩구", nameEn: "Flamengo", sport: "soccer", league: "Brasileirao" },
  { nameKr: "그레미우", nameEn: "Gremio", sport: "soccer", league: "Brasileirao" },
  { nameKr: "보카 주니어스", nameEn: "Boca Juniors", sport: "soccer", league: "Argentina" },
  { nameKr: "아틀레치쿠 미네이루", nameEn: "Atletico Mineiro", sport: "soccer", league: "Brasileirao" },
  { nameKr: "샤피코엔시", nameEn: "Chapecoense", sport: "soccer", league: "Brasileirao" },
  { nameKr: "RB 브라간치누", nameEn: "Red Bull Bragantino", sport: "soccer", league: "Brasileirao" },
  { nameKr: "클루비 두 헤무", nameEn: "Clube do Remo", sport: "soccer", league: "Brasileirao" },
  { nameKr: "상베르나르두", nameEn: "Sao Bernardo", sport: "soccer", league: "Brasileirao" },
  { nameKr: "미요나리오스 FC", nameEn: "Millonarios", sport: "soccer", league: "Colombia" },
  { nameKr: "아메리카 데 칼리", nameEn: "America de Cali", sport: "soccer", league: "Colombia" },
  { nameKr: "데포르티보 페레이라", nameEn: "Deportivo Pereira", sport: "soccer", league: "Colombia" },
  { nameKr: "인데펜디엔테 메데인", nameEn: "Independiente Medellin", sport: "soccer", league: "Colombia" },
  { nameKr: "온세 칼다스", nameEn: "Once Caldas", sport: "soccer", league: "Colombia" },
  { nameKr: "보야카 치코 FC", nameEn: "Boyaca Chico", sport: "soccer", league: "Colombia" },
  { nameKr: "아틀레티코 부카라망가", nameEn: "Atletico Bucaramanga", sport: "soccer", league: "Colombia" },
  { nameKr: "CA 사르미엔토", nameEn: "Sarmiento", sport: "soccer", league: "Argentina" },
  { nameKr: "CA 티그레", nameEn: "Club Atletico Tigre", sport: "soccer", league: "Argentina" },
  { nameKr: "바라카스 센트랄", nameEn: "Barracas Central", sport: "soccer", league: "Argentina" },
  { nameKr: "인데펜디엔테 리바다비아", nameEn: "Independiente Rivadavia", sport: "soccer", league: "Argentina" },
  { nameKr: "뉴캐슬 제츠 FC", nameEn: "Newcastle Jets", sport: "soccer", league: "A-League" },
  { nameKr: "맥아서 FC", nameEn: "Macarthur FC", sport: "soccer", league: "A-League" },
  { nameKr: "브리즈번 로어 FC", nameEn: "Brisbane Roar", sport: "soccer", league: "A-League" },
  { nameKr: "시드니 FC", nameEn: "Sydney FC", sport: "soccer", league: "A-League" },
  { nameKr: "데포르티보 라과이라", nameEn: "Deportivo La Guaira", sport: "soccer", league: "Venezuela" },
  { nameKr: "우니베르시다드 카톨리카", nameEn: "Universidad Catolica", sport: "soccer", league: "Chile" },
  { nameKr: "두바이", nameEn: "Shabab Al-Ahli Dubai", sport: "soccer", league: "UAE" },
  // Basketball
  { nameKr: "아나돌루 에페스", nameEn: "Anadolu Efes", sport: "basketball", league: "Euroleague" },
  { nameKr: "올림피아 밀라노", nameEn: "Olimpia Milano", sport: "basketball", league: "Euroleague" },
  { nameKr: "파나티나이코스", nameEn: "Panathinaikos", sport: "basketball", league: "Euroleague" },
  { nameKr: "잘기리스 카우나스", nameEn: "Zalgiris Kaunas", sport: "basketball", league: "Euroleague" },
  { nameKr: "마카비 텔아비브", nameEn: "Maccabi Tel Aviv", sport: "basketball", league: "Euroleague" },
  { nameKr: "츠르베나 즈베즈다", nameEn: "Crvena Zvezda", sport: "basketball", league: "Euroleague" },
  { nameKr: "파르티잔", nameEn: "Partizan Belgrade", sport: "basketball", league: "Euroleague" },
  // KHL
  { nameKr: "예카테린부르크", nameEn: "Avtomobilist Yekaterinburg", sport: "hockey", league: "KHL" },
  // Taiwan
  { nameKr: "라쿠텐 몽키스", nameEn: "Rakuten Monkeys", sport: "baseball", league: "CPBL" },
  { nameKr: "TSG 호크스", nameEn: "TSG Hawks", sport: "baseball", league: "CPBL" },
  { nameKr: "웨이취엔 드래곤스", nameEn: "Wei Chuan Dragons", sport: "baseball", league: "CPBL" },
  { nameKr: "퉁이 라이온스", nameEn: "Uni-President Lions", sport: "baseball", league: "CPBL" },
  { nameKr: "중신 브라더스", nameEn: "CTBC Brothers", sport: "baseball", league: "CPBL" },
  // China
  { nameKr: "난징 통시", nameEn: "Nanjing Monkey Kings", sport: "basketball", league: "CBA" },
  { nameKr: "닝보 로켓츠", nameEn: "Ningbo Rockets", sport: "basketball", league: "CBA" },
  { nameKr: "선전", nameEn: "Shenzhen Leopards", sport: "basketball", league: "CBA" },
  { nameKr: "저장 광사", nameEn: "Zhejiang Golden Bulls", sport: "basketball", league: "CBA" },
  { nameKr: "푸방 가디언스", nameEn: "Fujian Sturgeons", sport: "basketball", league: "CBA" },
];

async function main() {
  let created = 0, updated = 0, skipped = 0;
  for (const t of NEW_TEAMS) {
    const filename = t.nameKr.replace(/ /g, "_").replace(/\//g, "_") + ".png";
    const filepath = `${LOGO_DIR}/${filename}`;
    if (!fs.existsSync(filepath)) { skipped++; continue; }
    const logoPath = `/team-logos/${filename}`;
    await prisma.teamLogo.upsert({
      where: { nameKr: t.nameKr },
      create: { ...t, logoPath },
      update: { nameEn: t.nameEn, logoPath, sport: t.sport, league: t.league },
    });
    created++;
  }
  console.log(`Done: ${created} upserted, ${skipped} skipped (no file)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
