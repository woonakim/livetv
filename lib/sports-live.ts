export const SPORTS_LIVE_API_URL = "https://livetv.galaxy-stream.live/cli/api/public/games";

const CTGR_TO_SPORT: Record<string, string> = {
  football: "soccer",
  soccer: "soccer",
  baseball: "baseball",
  basketball: "basketball",
  volleyball: "volleyball",
  hockey: "hockey",
  egames: "esports",
  esports: "esports",
  ufc: "ufc",
};

const SPORT_NAMES: Record<string, string> = {
  soccer: "축구",
  baseball: "야구",
  basketball: "농구",
  volleyball: "배구",
  hockey: "하키",
  esports: "E스포츠",
  ufc: "UFC",
};

export interface SportsLiveMatch {
  id: string;
  sport: string;
  sportName: string;
  league: string;
  date: string;
  time: string;
  state: number;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  streams: {
    id: string;
    type: number;
    name: string;
    url: string;
  }[];
  isLive: boolean;
  streamUrl?: string;
  thumbnail?: string | null;
}

export interface SportsLiveResponse {
  live: SportsLiveMatch[];
  waiting: SportsLiveMatch[];
}

interface GalaxyItem {
  ssid: string;
  name: string;
  leag: string;
  ctgr: string;
  dttm: string;
  actv: string;
  oair?: string;
  surl?: string;
  surl2?: string;
  surl3?: string;
  thmb?: string;
  font?: string;
  chcd?: string;
  srcy?: string;
  span?: string;
}

function parseTeams(name: string): { home: string; away: string } {
  const parts = name.split(/\s+vs\s+/i);
  if (parts.length >= 2) {
    return { home: parts[0].trim(), away: parts[1].trim() };
  }
  return { home: name, away: "" };
}

function splitDateTime(dttm: string): { date: string; time: string } {
  const m = dttm.match(/^\d{4}-(\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (m) return { date: m[1], time: m[2] };
  return { date: "", time: "" };
}

function pickStreamUrl(item: GalaxyItem): string {
  for (const raw of [item.surl, item.surl2, item.surl3]) {
    if (raw && raw.trim()) return raw.trim();
  }
  return "";
}

function toPlayableUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("EMBED#")) return raw.slice("EMBED#".length);
  if (/\.m3u8(\?|$)/i.test(raw)) return `/api/broadcast-player?src=${encodeURIComponent(raw)}`;
  return raw;
}

// Pure parser — usable on server and client
export function parseGalaxyResponse(json: unknown, sport = ""): SportsLiveResponse {
  const raw = json as { data?: GalaxyItem[] } | null;
  const data: GalaxyItem[] = Array.isArray(raw?.data) ? raw!.data! : [];

  let matches: SportsLiveMatch[] = data
    .filter((item) => item.actv === "1")
    .map((item, idx) => {
      const sportId = CTGR_TO_SPORT[item.ctgr] || item.ctgr;
      const { home, away } = parseTeams(item.name || "");
      const { date, time } = splitDateTime(item.dttm || "");
      const rawStream = pickStreamUrl(item);
      const streamUrl = toPlayableUrl(rawStream);
      const isLive = item.oair === "1" || (!!rawStream && !!streamUrl);
      const matchId = item.ssid || `${sportId}-${idx}`;

      return {
        id: matchId,
        sport: sportId,
        sportName: SPORT_NAMES[sportId] || sportId,
        league: item.leag || "",
        date,
        time,
        state: isLive ? 2 : 0,
        home,
        away,
        homeScore: 0,
        awayScore: 0,
        streams: [{ id: matchId, type: 1, name: "CH1", url: streamUrl }],
        isLive,
        streamUrl,
        thumbnail: item.thmb || null,
      };
    });

  if (sport) matches = matches.filter((m) => m.sport === sport);

  return {
    live: matches.filter((m) => m.isLive),
    waiting: matches.filter((m) => !m.isLive).slice(0, 50),
  };
}

export async function fetchSportsLiveData(sport = ""): Promise<SportsLiveResponse> {
  const res = await fetch(SPORTS_LIVE_API_URL, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://livetv.galaxy-stream.live/",
    },
    cache: "no-store",
  });
  const json = await res.json();
  return parseGalaxyResponse(json, sport);
}
