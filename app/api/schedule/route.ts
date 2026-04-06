export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const LEAGUES = [
  { id: "soccer/eng.1", sport: "soccer", league: "EPL", name: "프리미어리그" },
  { id: "soccer/esp.1", sport: "soccer", league: "라리가", name: "라리가" },
  { id: "soccer/ger.1", sport: "soccer", league: "분데스리가", name: "분데스리가" },
  { id: "soccer/ita.1", sport: "soccer", league: "세리에A", name: "세리에A" },
  { id: "soccer/fra.1", sport: "soccer", league: "리그앙", name: "리그앙" },
  { id: "baseball/mlb", sport: "baseball", league: "MLB", name: "MLB" },
  { id: "basketball/nba", sport: "basketball", league: "NBA", name: "NBA" },
  { id: "hockey/nhl", sport: "hockey", league: "NHL", name: "NHL" },
];

// 팀명 매핑 + 로고 + 전적 캐시
interface TeamInfo {
  nameKr: string;
  logo: string;
  record: string; // 순위+전적
}

let teamCache: { map: Record<string, TeamInfo>; ts: number } | null = null;

async function getTeamInfo(): Promise<Record<string, TeamInfo>> {
  if (teamCache && Date.now() - teamCache.ts < 300000) return teamCache.map; // 5분 캐시

  const map: Record<string, TeamInfo> = {};

  // 1. DB에서 팀 로고 + 한글/영문명 가져오기
  const teams = await prisma.teamLogo.findMany({
    where: { isActive: true },
    select: { nameKr: true, nameEn: true, logoPath: true },
  });

  const enToKr: Record<string, { kr: string; logo: string }> = {};
  for (const t of teams) {
    if (t.nameEn) {
      enToKr[t.nameEn.toLowerCase()] = { kr: t.nameKr, logo: t.logoPath };
    }
  }

  // 2. 스코어보드에서 전적 가져오기 (외부 소스 직접 호출)
  try {
    const standingsRes = await fetch("https://livescore.co.kr/topleft_ranking.php", {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://livescore.co.kr/" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await standingsRes.text();
    const matchData = html.match(/var\s+ranking_data\s*=\s*'(\{[^']*\})'/);
    if (matchData) {
      const raw = JSON.parse(matchData[1]);
      const leagueMap: Record<string, string> = {
        epl: "soccer", primera: "soccer", bundesliga: "soccer", seriea: "soccer",
        ligue1: "soccer", eredivisie: "soccer", kbo: "baseball", futures: "baseball",
        American: "baseball", National: "baseball", central: "baseball", pacific: "baseball",
        kbl: "basketball", wkbl: "basketball", nba_east: "basketball", nba_west: "basketball",
        kovo_vl: "volleyball", kovo_wvl: "volleyball", nhl: "hockey", KHL: "hockey",
      };
      for (const [key, val] of Object.entries(raw)) {
        const sport = leagueMap[key];
        if (!sport) continue;
        const entry = val as { TITLE?: Record<string, string[]>; DATA?: Record<string, (string | number)[][]> };
        if (!entry.TITLE || !entry.DATA) continue;
        for (const [divName, columns] of Object.entries(entry.TITLE)) {
          let rows: (string | number)[][] = [];
          const rawRows = entry.DATA[divName];
          if (Array.isArray(rawRows)) {
            rows = rawRows;
          } else if (typeof rawRows === "object" && rawRows !== null) {
            rows = Object.values(rawRows) as (string | number)[][];
          }
          if (!rows.length) continue;
          const colMap: Record<string, number> = {};
          (columns as string[]).forEach((c, i) => { colMap[c] = i; });
          for (const row of rows) {
            if (!Array.isArray(row)) continue;
            const get = (k: string) => { const idx = colMap[k]; return idx !== undefined ? String(row[idx]) : ""; };
            const team = get("팀") || get("선수") || get("국가") || "";
            if (!team) continue;
            const rank = parseInt(get("순위")) || 0;
            const won = parseInt(get("승")) || 0;
            const lost = parseInt(get("패")) || 0;
            const drawn = parseInt(get("무")) || 0;
            const record = sport === "soccer"
              ? `${rank}위 ${won}승 ${drawn}무 ${lost}패`
              : `${rank}위 ${won}승 ${lost}패`;
            const { createHash } = await import("crypto");
            const md5 = createHash("md5").update(team).digest("hex");
            const noLogo = ["tennis_M", "tennis_W", "FIFA"];
            const logo = noLogo.includes(key) ? "" : `/team-logos/${key}_${md5}.png`;
            map[team] = { nameKr: team, logo, record };
          }
        }
      }
    }
  } catch { /* 스코어보드 실패해도 계속 진행 */ }

  // 3. 영문 → 한글+로고+전적 매핑 테이블 구축
  const sbTeamNames = Object.keys(map).filter(k => !k.startsWith("en:"));

  for (const [enLower, info] of Object.entries(enToKr)) {
    // 스코어보드에서 전적 찾기 (정확 매칭 → 부분 매칭)
    let record = map[info.kr]?.record || "";
    if (!record) {
      for (const sbName of sbTeamNames) {
        if (info.kr.includes(sbName) || sbName.includes(info.kr)) {
          record = map[sbName]?.record || "";
          if (record) break;
        }
      }
    }

    // 로고는 DB(TeamLogo)의 logoPath를 우선 사용
    map[`en:${enLower}`] = {
      nameKr: info.kr,
      logo: info.logo, // DB 로고 우선
      record,
    };
  }

  teamCache = { map, ts: Date.now() };
  return map;
}

function resolveTeam(engName: string, infoMap: Record<string, TeamInfo>): TeamInfo {
  const lower = engName.toLowerCase();

  // 정확한 영문 매칭
  const exact = infoMap[`en:${lower}`];
  if (exact) return exact;

  // 부분 매칭 (contains)
  for (const [key, val] of Object.entries(infoMap)) {
    if (!key.startsWith("en:")) continue;
    const enKey = key.slice(3);
    if (lower.includes(enKey) || enKey.includes(lower)) return val;
  }

  // 한글명 직접 매칭 (이미 한글인 경우)
  if (infoMap[engName]) return infoMap[engName];

  return { nameKr: engName, logo: "", record: "" };
}

interface ScheduleEvent {
  date: string;
  homeTeam: string;
  homeTeamEn: string;
  homeLogo: string;
  homeRecord: string;
  awayTeam: string;
  awayTeamEn: string;
  awayLogo: string;
  awayRecord: string;
  league: string;
  sport: string;
}

// 응답 캐시 (10분)
let scheduleCache: { data: unknown; ts: number; key: string } | null = null;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueFilter = searchParams.get("league") || "";
  const cacheKey = leagueFilter || "__all__";

  // 캐시 히트 (10분)
  if (scheduleCache && scheduleCache.key === cacheKey && Date.now() - scheduleCache.ts < 600000) {
    return NextResponse.json(scheduleCache.data);
  }

  const dates: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }

  const infoMap = await getTeamInfo();
  const targetLeagues = leagueFilter
    ? LEAGUES.filter(l => l.league === leagueFilter || l.id === leagueFilter)
    : LEAGUES;

  const allEvents: ScheduleEvent[] = [];

  const fetches = targetLeagues.flatMap(league =>
    dates.map(async (date) => {
      try {
        const res = await fetch(`${ESPN_BASE}/${league.id}/scoreboard?dates=${date}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const data = await res.json();

        for (const e of (data.events || [])) {
          const comp = e.competitions?.[0];
          if (!comp) continue;
          const teams = comp.competitors || [];
          const homeEn = teams.find((t: { homeAway: string }) => t.homeAway === "home")?.team?.displayName || "";
          const awayEn = teams.find((t: { homeAway: string }) => t.homeAway === "away")?.team?.displayName || "";
          if (!homeEn || !awayEn) continue;

          const homeInfo = resolveTeam(homeEn, infoMap);
          const awayInfo = resolveTeam(awayEn, infoMap);

          allEvents.push({
            date: e.date,
            homeTeam: homeInfo.nameKr,
            homeTeamEn: homeEn,
            homeLogo: homeInfo.logo,
            homeRecord: homeInfo.record,
            awayTeam: awayInfo.nameKr,
            awayTeamEn: awayEn,
            awayLogo: awayInfo.logo,
            awayRecord: awayInfo.record,
            league: league.league,
            sport: league.sport,
          });
        }
      } catch { /* skip */ }
    })
  );

  await Promise.allSettled(fetches);
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const result = {
    leagues: LEAGUES.map(l => ({ id: l.id, sport: l.sport, league: l.league, name: l.name })),
    events: allEvents,
  };

  scheduleCache = { data: result, ts: Date.now(), key: cacheKey };
  return NextResponse.json(result);
}
