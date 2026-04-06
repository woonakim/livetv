import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";


// DB TeamLogo에서 팀명→로고 매핑 캐시
let dbLogoCache: Record<string, string> | null = null;
async function getDbLogoMap(): Promise<Record<string, string>> {
  if (dbLogoCache) return dbLogoCache;
  const teams = await prisma.teamLogo.findMany({ where: { isActive: true }, select: { nameKr: true, logoPath: true } });
  const map: Record<string, string> = {};
  for (const t of teams) {
    if (t.logoPath) map[t.nameKr] = t.logoPath;
  }
  dbLogoCache = map;
  setTimeout(() => { dbLogoCache = null; }, 3600000); // 1시간 후 캐시 무효화
  return map;
}

const SOURCE_URL = "https://livescore.co.kr/topleft_ranking.php";
const CACHE_TTL = 60 * 60 * 1000; // 1시간

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

/* ── 타입 ── */
interface TeamRow {
  rank: number;
  team: string;
  logo: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  pts: string;
  form: string[];
}

interface LeagueStandings {
  sport: string;
  league: string;
  division?: string;
  columns: string[];
  teams: TeamRow[];
}

/* ── 캐시 ── */
let cache: { data: LeagueStandings[]; ts: number } | null = null;

/* ── livescore.co.kr 리그 키 → 우리 리그 매핑 ── */
const LEAGUE_MAP: Record<string, { sport: string; league: string }> = {
  epl:        { sport: "soccer", league: "EPL" },
  primera:    { sport: "soccer", league: "라리가" },
  bundesliga: { sport: "soccer", league: "분데스리가" },
  seriea:     { sport: "soccer", league: "세리에A" },
  ligue1:     { sport: "soccer", league: "리그앙" },
  eredivisie: { sport: "soccer", league: "에레디비시" },
  kbo:        { sport: "baseball", league: "KBO" },
  futures:    { sport: "baseball", league: "퓨처스" },
  American:   { sport: "baseball", league: "MLB(AL)" },
  National:   { sport: "baseball", league: "MLB(NL)" },
  central:    { sport: "baseball", league: "NPB(CL)" },
  pacific:    { sport: "baseball", league: "NPB(PL)" },
  kbl:        { sport: "basketball", league: "KBL" },
  wkbl:       { sport: "basketball", league: "WKBL" },
  nba_east:   { sport: "basketball", league: "NBA 동부" },
  nba_west:   { sport: "basketball", league: "NBA 서부" },
  kovo_vl:    { sport: "volleyball", league: "V리그(남)" },
  kovo_wvl:   { sport: "volleyball", league: "V리그(여)" },
  nhl:        { sport: "hockey", league: "NHL" },
  KHL:        { sport: "hockey", league: "KHL" },
  FIFA:       { sport: "soccer", league: "FIFA 랭킹" },
};

/* ── 파싱 헬퍼 ── */
function parseRow(row: (string | number)[], columns: string[], leagueKey: string, dbLogoMap: Record<string, string>): TeamRow {
  // columns: ["순위","팀","경기","승","패","승점"] 등 다양한 형태
  const colMap: Record<string, number> = {};
  columns.forEach((c, i) => { colMap[c] = i; });

  const get = (key: string): string => {
    const idx = colMap[key];
    return idx !== undefined ? String(row[idx]) : "";
  };

  const rank = parseInt(get("순위")) || 0;
  const team = get("팀") || get("선수") || get("국가") || "";
  const played = parseInt(get("경기")) || 0;
  const won = parseInt(get("승")) || 0;
  const lost = parseInt(get("패")) || 0;
  const drawn = parseInt(get("무")) || 0;

  // 승점 또는 승률
  let pts = get("승점") || get("포인트") || get("승율") || get("승률") || "";
  if (!pts && won > 0) {
    pts = String(won);
  }

  // 테니스/FIFA는 팀 로고 없음
  const noLogo = ["tennis_M", "tennis_W", "FIFA", "EasternConference1", "WesternConference1"];
  let logo = "";
  if (!noLogo.includes(leagueKey)) {
    const pub = join(process.cwd(), "public");
    // 1순위: DB TeamLogo (정확 + 부분 매칭)
    if (dbLogoMap[team] && existsSync(join(pub, dbLogoMap[team]))) {
      logo = dbLogoMap[team];
    }
    if (!logo) {
      for (const [kr, lp] of Object.entries(dbLogoMap)) {
        if (kr.length >= 2 && team.length >= 2 && (team.includes(kr) || kr.includes(team)) && existsSync(join(pub, lp))) {
          logo = lp; break;
        }
      }
    }
    // 2순위: 리그키_md5.png
    if (!logo) {
      const dl = `/team-logos/${leagueKey}_${md5(team)}.png`;
      if (existsSync(join(pub, dl))) logo = dl;
    }
    // 3순위: 한글팀명.png
    if (!logo) {
      for (const tl of [`/team-logos/${team.replace(/ /g, "_")}.png`, `/team-logos/${team.replace(/ /g, "")}.png`]) {
        if (existsSync(join(pub, tl))) { logo = tl; break; }
      }
    }
  }

  return {
    rank: rank || 0,
    team,
    logo,
    played,
    won,
    lost,
    drawn,
    pts,
    form: [],
  };
}

function parseRankingData(raw: Record<string, unknown>, dbLogoMap: Record<string, string>): LeagueStandings[] {
  const results: LeagueStandings[] = [];

  for (const [key, value] of Object.entries(raw)) {
    const mapping = LEAGUE_MAP[key];
    if (!mapping) continue;

    try {
      const entry = value as { TITLE?: Record<string, string[]>; DATA?: Record<string, (string | number)[][]> };
      const { TITLE, DATA } = entry;
      if (!TITLE || typeof TITLE !== "object" || !DATA || typeof DATA !== "object") continue;

      for (const [divName, columns] of Object.entries(TITLE)) {
        if (!Array.isArray(columns)) continue;
        let rows = DATA[divName];
        if (!rows) continue;

        // PHP JSON에서 비연속 인덱스 배열이 object로 변환되는 케이스 처리
        if (!Array.isArray(rows) && typeof rows === "object" && rows !== null) {
          rows = Object.values(rows) as (string | number)[][];
        }
        if (!Array.isArray(rows)) continue;

        const teams = rows.map((row) => {
          if (!Array.isArray(row)) return null;
          return parseRow(row, columns, key, dbLogoMap);
        }).filter((t): t is TeamRow => t !== null && !!t.team);

        teams.forEach((t, i) => { if (!t.rank) t.rank = i + 1; });

        results.push({
          sport: mapping.sport,
          league: mapping.league,
          division: Object.keys(TITLE).length > 1 ? divName : undefined,
          columns,
          teams,
        });
      }
    } catch {
      // 파싱 실패한 리그는 스킵
      continue;
    }
  }

  return results;
}

/* ── 데이터 가져오기 ── */
async function fetchStandings(): Promise<LeagueStandings[]> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://livescore.co.kr/",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // ranking_data JSON 추출
  const match = html.match(/var\s+ranking_data\s*=\s*'(\{[^']*\})'/);
  if (!match) throw new Error("ranking_data not found");

  const raw = JSON.parse(match[1]);
  const logoMap = await getDbLogoMap();
  return parseRankingData(raw, logoMap);
}

/* ── API Route ── */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport") || "";
  const league = searchParams.get("league") || "";

  const now = Date.now();

  // 캐시 체크
  if (!cache || now - cache.ts > CACHE_TTL) {
    try {
      const data = await fetchStandings();
      cache = { data, ts: now };
    } catch (e) {
      console.error("standings fetch error:", e);
      if (!cache) {
        return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
      }
      // 실패 시 이전 캐시 사용
    }
  }

  let result = cache!.data;

  // 필터
  if (sport) {
    result = result.filter(r => r.sport === sport);
  }
  if (league) {
    result = result.filter(r => r.league === league);
  }

  return NextResponse.json({
    updatedAt: new Date(cache!.ts).toISOString(),
    standings: result,
  });
}
