const API_URL = "https://api.winner-stream.com/api_list2.php";

const ICON_TO_SPORT: Record<string, string> = {
  soccer: "soccer",
  baseball: "baseball",
  basketball: "basketball",
  volleyball: "volleyball",
  hockey: "hockey",
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

function buildStableMatchId(item: {
  icon: string;
  name: string;
  url: string;
  url2: string;
}): string {
  const raw = item.url2 || item.url || `${item.icon}-${item.name}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function parseTeams(name: string): { home: string; away: string } {
  const parts = name.split(/\s+vs\s+/i);
  if (parts.length >= 2) {
    return { home: parts[0].trim(), away: parts[1].trim() };
  }
  return { home: name, away: "" };
}

export async function fetchSportsLiveData(sport = ""): Promise<SportsLiveResponse> {
  const res = await fetch(API_URL, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    cache: "no-store",
  });

  const json: Array<{
    icon: string;
    schedule_date: string;
    schedule_time: string;
    description: string;
    name: string;
    status: number;
    type: string;
    url: string;
    url2: string;
  }> = await res.json();

  let matches: SportsLiveMatch[] = json
    .filter((item) => item.status === 1)
    .map((item, idx) => {
      const sportId = ICON_TO_SPORT[item.icon] || item.icon;
      const { home, away } = parseTeams(item.name);
      const isLive = item.type === "live";
      const matchId = buildStableMatchId(item);

      return {
        id: matchId,
        sport: sportId,
        sportName: SPORT_NAMES[sportId] || item.icon,
        league: item.description,
        date: item.schedule_date,
        time: item.schedule_time,
        state: isLive ? 2 : 0,
        home,
        away,
        homeScore: 0,
        awayScore: 0,
        streams: [{
          id: item.url2 || item.url || `${matchId}-${idx}`,
          type: 1,
          name: "CH1",
          url: item.url,
        }],
        isLive,
        streamUrl: item.url,
        thumbnail: (() => {
          if (!isLive) return null;
          // player.php?ch=MzQ2 → thumb_MzQ2.webp
          const chMatch = item.url.match(/[?&]ch=([^&]+)/);
          if (chMatch) return `https://design.ultastream.com/cache/thumbs/thumb_${chMatch[1]}.webp`;
          return null;
        })(),
      };
    });

  if (sport) {
    matches = matches.filter((match) => match.sport === sport);
  }

  return {
    live: matches.filter((match) => match.isLive),
    waiting: matches.filter((match) => !match.isLive).slice(0, 50),
  };
}
