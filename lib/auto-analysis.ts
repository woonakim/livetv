import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
// ESPN_STANDINGS는 더 이상 사용하지 않음 (우리 standings API 사용)

const LEAGUE_MAP: Record<string, { espnId: string; sport: string }> = {
  "EPL": { espnId: "soccer/eng.1", sport: "soccer" },
  "라리가": { espnId: "soccer/esp.1", sport: "soccer" },
  "세리에A": { espnId: "soccer/ita.1", sport: "soccer" },
  "분데스리가": { espnId: "soccer/ger.1", sport: "soccer" },
  "리그앙": { espnId: "soccer/fra.1", sport: "soccer" },
  "MLB": { espnId: "baseball/mlb", sport: "baseball" },
  "NBA": { espnId: "basketball/nba", sport: "basketball" },
  "NHL": { espnId: "hockey/nhl", sport: "hockey" },
};

interface MatchInfo {
  league: string;
  sport: string;
  matchTime: string;
  homeTeam: string;
  homeRecord: string;
  awayTeam: string;
  awayRecord: string;
  matchKey: string;
}

interface TeamStanding {
  name: string;
  rank: number;
  record: string; // "1위 21승 7무 3패"
}

// 리그 한글명 → standings API의 league 키 매핑
const STANDINGS_LEAGUE_MAP: Record<string, string[]> = {
  "EPL": ["EPL"],
  "라리가": ["라리가"],
  "세리에A": ["세리에A"],
  "분데스리가": ["분데스리가"],
  "리그앙": ["리그앙"],
  "MLB": ["MLB(AL)", "MLB(NL)"],
  "NBA": ["NBA 동부", "NBA 서부"],
  "NHL": ["NHL"],
};

// 우리 standings API에서 상위 N위 팀 + 전적 추출
async function getTopTeams(_espnId: string, sport: string, topN: number, league: string): Promise<{ topTeams: TeamStanding[]; allTeams: TeamStanding[] }> {
  try {
    const res = await fetch("http://localhost:3000/api/standings", { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { topTeams: [], allTeams: [] };
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allStandings: any[] = data.standings || [];

    const leagueKeys = STANDINGS_LEAGUE_MAP[league] || [];
    const teams: TeamStanding[] = [];

    for (const s of allStandings) {
      // league 키 매칭 (standings의 league 또는 division에 포함)
      const matchesLeague = leagueKeys.some(k =>
        s.league === k || s.league?.startsWith(k)
      );
      if (!matchesLeague) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of (s.teams || []) as any[]) {
        const rank = t.rank || 99;
        const won = t.won || 0;
        const lost = t.lost || 0;
        const drawn = t.drawn || 0;
        const name = t.team || "";

        let record: string;
        if (sport === "soccer") {
          record = `${rank}위 ${won}승 ${drawn}무 ${lost}패`;
        } else {
          record = `${rank}위 ${won}승 ${lost}패`;
        }

        if (name) teams.push({ name, rank, record });
      }
    }

    teams.sort((a, b) => a.rank - b.rank);
    return { topTeams: teams.slice(0, topN), allTeams: teams };
  } catch (e) {
    console.error("[auto-analysis] getTopTeams error:", e);
    return { topTeams: [], allTeams: [] };
  }
}

// ESPN schedule에서 해당 팀의 다음 경기 찾기
async function getUpcomingMatches(espnId: string, league: string, sport: string, topTeams: TeamStanding[], allTeams: TeamStanding[]): Promise<MatchInfo[]> {
  const matches: MatchInfo[] = [];

  // 전체 standings 한글명 → record 매핑 (상대팀도 전적 표시)
  const krRecordMap: Record<string, string> = {};
  for (const t of allTeams) krRecordMap[t.name.toLowerCase()] = t.record;

  // 상위팀 전용 맵 (경기 필터링용)
  const topTeamNames = new Set(topTeams.map(t => t.name.toLowerCase()));

  // DB에서 영문→한글 + 한글→영문 양방향 매핑
  const teamLogos = await prisma.teamLogo.findMany({ where: { isActive: true }, select: { nameKr: true, nameEn: true } });
  const enToKr: Record<string, string> = {};
  const krToEn: Record<string, string> = {};
  for (const t of teamLogos) {
    if (t.nameEn) {
      enToKr[t.nameEn.toLowerCase()] = t.nameKr;
      krToEn[t.nameKr.toLowerCase()] = t.nameEn.toLowerCase();
    }
  }

  // ESPN 영문명 → standings record 찾기
  function getRecord(engName: string): string {
    const lower = engName.toLowerCase();
    // 1. 영문→한글 변환 후 standings에서 찾기
    const krExact = enToKr[lower];
    if (krExact && krRecordMap[krExact.toLowerCase()]) return krRecordMap[krExact.toLowerCase()];
    // 2. 영문명 부분매칭으로 한글 찾기
    for (const [en, kr] of Object.entries(enToKr)) {
      if (lower.includes(en) || en.includes(lower)) {
        if (krRecordMap[kr.toLowerCase()]) return krRecordMap[kr.toLowerCase()];
        // 한글명 부분매칭
        for (const [krKey, rec] of Object.entries(krRecordMap)) {
          if (kr.toLowerCase().includes(krKey) || krKey.includes(kr.toLowerCase())) return rec;
        }
      }
    }
    // 3. standings 한글명 직접 부분매칭 (DB 거치지 않고)
    for (const [krKey, rec] of Object.entries(krRecordMap)) {
      const enOfKr = krToEn[krKey];
      if (enOfKr && (lower.includes(enOfKr) || enOfKr.includes(lower))) return rec;
    }
    return "";
  }

  // ESPN 영문명이 상위팀인지 확인
  function isTopTeam(engName: string): boolean {
    const lower = engName.toLowerCase();
    const kr = enToKr[lower];
    if (kr && topTeamNames.has(kr.toLowerCase())) return true;
    for (const [en, krVal] of Object.entries(enToKr)) {
      if (lower.includes(en) || en.includes(lower)) {
        if (topTeamNames.has(krVal.toLowerCase())) return true;
        for (const tn of Array.from(topTeamNames)) {
          if (krVal.toLowerCase().includes(tn) || tn.includes(krVal.toLowerCase())) return true;
        }
      }
    }
    return false;
  }
  const dates: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }

  for (const date of dates) {
    try {
      const res = await fetch(`${ESPN_BASE}/${espnId}/scoreboard?dates=${date}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();

      for (const e of data.events || []) {
        const comp = e.competitions?.[0];
        if (!comp) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const homeData = comp.competitors?.find((c: any) => c.homeAway === "home");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const awayData = comp.competitors?.find((c: any) => c.homeAway === "away");
        const home = homeData?.team?.displayName || "";
        const away = awayData?.team?.displayName || "";
        if (!home || !away) continue;

        // 상위팀이 포함된 경기만
        if (!isTopTeam(home) && !isTopTeam(away)) continue;

        // 아직 시작 안 한 경기만
        const status = comp.status?.type?.name || "";
        if (status === "STATUS_FINAL" || status === "STATUS_IN_PROGRESS") continue;

        // standings에서 한글 전적 가져오기, 없으면 ESPN record 폴백
        const homeRecord = getRecord(home) || homeData?.records?.[0]?.summary || "";
        const awayRecord = getRecord(away) || awayData?.records?.[0]?.summary || "";
        const matchDate = e.date?.slice(0, 10) || date;
        const matchKey = `${league}_${matchDate}_${home}_vs_${away}`;

        matches.push({
          league, sport, matchTime: e.date || new Date().toISOString(),
          homeTeam: home, homeRecord, awayTeam: away, awayRecord, matchKey,
        });
      }
    } catch { /* skip */ }
  }

  return matches;
}

// AI 호출 (non-streaming)
async function callAI(model: string, prompt: string, apiKeys: { anthropic: string; openai: string; gemini: string }): Promise<string> {
  if (model === "gpt" && apiKeys.openai) {
    const client = new OpenAI({ apiKey: apiKeys.openai });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini", max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content || "";
  }

  if (model === "gemini" && apiKeys.gemini) {
    const genAI = new GoogleGenerativeAI(apiKeys.gemini);
    const m = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await m.generateContent(prompt);
    return result.response.text();
  }

  // Default: Claude
  if (apiKeys.anthropic) {
    const client = new Anthropic({ apiKey: apiKeys.anthropic });
    const res = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.content[0] as any)?.text || "";
  }

  throw new Error("사용 가능한 AI API 키가 없습니다");
}

function buildAutoPrompt(m: MatchInfo): string {
  const sportName: Record<string, string> = { soccer: "축구", baseball: "야구", basketball: "농구", hockey: "하키" };
  const matchDate = new Date(m.matchTime);
  const kstDate = new Date(matchDate.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, "0")}-${String(kstDate.getUTCDate()).padStart(2, "0")} ${String(kstDate.getUTCHours()).padStart(2, "0")}:${String(kstDate.getUTCMinutes()).padStart(2, "0")} KST`;

  return `당신은 전문 스포츠 분석가입니다. 다음 ${sportName[m.sport] || "스포츠"} 경기에 대해 한국어로 분석글을 작성해주세요.

[경기 정보]
- 리그: ${m.league}
- 일시: ${dateStr}
- 홈: ${m.homeTeam} ${m.homeRecord ? `(${m.homeRecord})` : ""}
- 원정: ${m.awayTeam} ${m.awayRecord ? `(${m.awayRecord})` : ""}

아래 마크다운 서식을 따라주세요:
- ## 소제목
- **굵은텍스트** 강조
- - 리스트

다음 구조로 작성:
1. 경기 소개 (1~2문장)
2. ## 경기 핵심 포인트 — 3개 핵심 분석
3. ## 전술 / 데이터 분석 — 양팀 전술, 최근 폼, 강점/약점 (2~3문단)
4. ## 분석 결론 — 종합 분석, 추천 픽, 예상 스코어

전문가 수준 통찰력으로 500~700자 내외 작성.`;
}

// 메인 실행 함수 (manual=true면 isEnabled 무시)
export async function runAutoAnalysis(manual = false): Promise<{ created: number; skipped: number; errors: string[] }> {
  let settings = await prisma.autoAnalysisSetting.findFirst();

  // 설정이 없으면 기본값으로 생성
  if (!settings) {
    settings = await prisma.autoAnalysisSetting.create({
      data: { id: 1, isEnabled: false, targetLeagues: '["EPL","라리가","MLB","NBA"]', topN: 4, cronHour: 8, cronMinute: 0, aiModel: "claude", autoPublish: false },
    });
  }

  if (!manual && !settings.isEnabled) return { created: 0, skipped: 0, errors: ["자동 분석이 비활성화 상태입니다"] };
  console.log("[auto-analysis] Settings loaded, fetching API keys...");

  const siteSettings = await prisma.siteSetting.findFirst();
  const apiKeys = {
    anthropic: siteSettings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "",
    openai: siteSettings?.openaiApiKey || "",
    gemini: siteSettings?.geminiApiKey || "",
  };

  let targetLeagues: string[] = [];
  try { targetLeagues = JSON.parse(settings.targetLeagues); } catch { targetLeagues = ["EPL", "MLB", "NBA"]; }

  // 팀 로고 + 한글명 매핑 (DB에서 가져오기)
  const teamLogos = await prisma.teamLogo.findMany({ where: { isActive: true }, select: { nameKr: true, nameEn: true, logoPath: true } });
  const enToKr: Record<string, { kr: string; logo: string }> = {};
  for (const t of teamLogos) {
    if (t.nameEn) enToKr[t.nameEn.toLowerCase()] = { kr: t.nameKr, logo: t.logoPath };
  }

  function resolveTeam(engName: string): { nameKr: string; logo: string } {
    const lower = engName.toLowerCase();
    const exact = enToKr[lower];
    if (exact) return { nameKr: exact.kr, logo: exact.logo };
    for (const [key, val] of Object.entries(enToKr)) {
      if (lower.includes(key) || key.includes(lower)) return { nameKr: val.kr, logo: val.logo };
    }
    return { nameKr: engName, logo: "" };
  }

  // 자동 분석 전용 계정 (닉네임: 픽스터)
  const autoUser = await prisma.user.findUnique({ where: { username: "auto_pickster" }, select: { id: true } });
  const authorId = autoUser?.id || 1;

  let created = 0, skipped = 0;
  const errors: string[] = [];

  for (const league of targetLeagues) {
    const leagueInfo = LEAGUE_MAP[league];
    if (!leagueInfo) continue;
    console.log(`[auto-analysis] ${league}: Fetching top ${settings.topN} teams...`);

    const { topTeams, allTeams } = await getTopTeams(leagueInfo.espnId, leagueInfo.sport, settings.topN, league);
    if (topTeams.length === 0) { errors.push(`${league}: 순위 데이터 없음`); continue; }

    console.log(`[auto-analysis] ${league}: Top teams:`, topTeams.map(t => t.name));
    const allMatches = await getUpcomingMatches(leagueInfo.espnId, league, leagueInfo.sport, topTeams, allTeams);
    // 리그당 최대 3경기만 생성
    const matches = allMatches.slice(0, 3);
    console.log(`[auto-analysis] ${league}: Found ${allMatches.length} matches, processing ${matches.length}`);

    for (const match of matches) {
      // 중복 체크
      const existing = await prisma.analysisPost.findFirst({ where: { matchKey: match.matchKey } });
      if (existing) { skipped++; continue; }

      try {
        const prompt = buildAutoPrompt(match);
        const content = await callAI(settings.aiModel, prompt, apiKeys);
        if (!content) { errors.push(`${match.matchKey}: AI 응답 없음`); continue; }

        // 제목 추출 (첫 번째 ## 또는 자동 생성)
        const titleMatch = content.match(/^##?\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : `${match.homeTeam} vs ${match.awayTeam} 경기 분석`;

        // 예측 추출
        const predMatch = content.match(/추천\s*픽[：:]?\s*(.+)/);
        const prediction = predMatch ? predMatch[1].trim() : `${match.homeTeam} vs ${match.awayTeam}`;

        const homeResolved = resolveTeam(match.homeTeam);
        const awayResolved = resolveTeam(match.awayTeam);

        await prisma.analysisPost.create({
          data: {
            authorId,
            sport: match.sport,
            league: match.league,
            matchTime: new Date(match.matchTime),
            homeTeam: homeResolved.nameKr,
            homeLogo: homeResolved.logo,
            homeRecord: match.homeRecord,
            awayTeam: awayResolved.nameKr,
            awayLogo: awayResolved.logo,
            awayRecord: match.awayRecord,
            title: title.replace(match.homeTeam, homeResolved.nameKr).replace(match.awayTeam, awayResolved.nameKr),
            content,
            prediction,
            isAutoGenerated: true,
            matchKey: match.matchKey,
            isDraft: !settings.autoPublish,
            isPublic: settings.autoPublish,
          },
        });
        created++;

        // API rate limit 방지
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        errors.push(`${match.matchKey}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { created, skipped, errors };
}
