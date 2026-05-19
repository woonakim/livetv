export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  views: string;
  publishedTime: string;
  publishedDate: string; // "03월 20일" 형식
  publishedAt: number;   // Unix timestamp (ms) for sorting
  thumbnail: string;
  category: string;    // soccer, baseball, basketball, volleyball, golf, motorsport, ufc, esports, etc
  league: string;      // EPL, 세리에A, MLB, KBO, NBA 등
  homeTeam: string;
  awayTeam: string;
  isHighlight: boolean;
}

const YOUTUBE_API_KEY_DEFAULT = process.env.YOUTUBE_API_KEY || "";

let cachedYtKey: { key: string; ts: number } | null = null;
async function getYoutubeKey(): Promise<string> {
  if (cachedYtKey && Date.now() - cachedYtKey.ts < 600000) return cachedYtKey.key;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const s = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    await prisma.$disconnect();
    const key = s?.youtubeApiKey || YOUTUBE_API_KEY_DEFAULT;
    cachedYtKey = { key, ts: Date.now() };
    return key;
  } catch {
    return YOUTUBE_API_KEY_DEFAULT;
  }
}

const HIGHLIGHT_CHANNELS = [
  { id: "UCtm_QoN2SIxwCE-59shX7Qg", name: "SPOTV" },
  { id: "UC8JtQf77wqhVpOQ8Cze8JjA", name: "TVING SPORTS" },
  { id: "UCtybqqaTj6Nx74Azdz1KrsA", name: "tvN SPORTS" },
  { id: "UCw1DsweY9b2AKGjV4kGJP1A", name: "LCK" },
];

// 리그 → 카테고리 매핑
const LEAGUE_CATEGORY: Record<string, string> = {
  "EPL": "soccer", "프리미어리그": "soccer",
  "세리에A": "soccer", "세리에": "soccer",
  "라리가": "soccer", "분데스리가": "soccer",
  "리그앙": "soccer", "에레디비시": "soccer",
  "UCL": "soccer", "챔피언스리그": "soccer",
  "UEL": "soccer", "유로파리그": "soccer",
  "K리그": "soccer", "FA컵": "soccer",
  "FOOTBALL": "soccer", "AFC": "soccer",
  "MLB": "baseball", "KBO": "baseball", "NPB": "baseball", "WBC": "baseball",
  "다저스": "baseball", "에인절스": "baseball", "애슬레틱스": "baseball",
  "NBA": "basketball", "KBL": "basketball",
  "프로농구": "basketball", "여자프로농구": "basketball",
  "V리그": "volleyball", "프로배구": "volleyball",
  "LPGA": "golf", "PGA": "golf",
  "F1": "motorsport", "Formula": "motorsport", "E-PRIX": "motorsport",
  "UFC": "ufc", "MMA": "ufc",
  "LCK": "lol", "LPL": "lol", "LOL": "lol",
};

// 팀명에서 노이즈 제거 — 리그 접두어, 하이라이트 접미어, 매치 번호, 구분자 뒤 잡문자 등
function sanitizeTeamName(name: string): string {
  if (!name) return "";
  let s = name;
  // 리그/카테고리 접두어 (이미 league 필드로 저장됨)
  s = s.replace(/^(일본\s*프로\s*농구|일본\s*농구|일본\s*프로\s*야구|일본\s*야구|일본\s*축구|프로\s*농구|여자\s*프로\s*농구|남자\s*프로\s*농구|프로\s*배구|여자\s*프로\s*배구|남자\s*프로\s*배구|프리미어\s*리그|세리에\s*A|세리에|라\s*리가|분데스리가|리그앙|에레디비시|챔피언스리그|챔스|유로파리그|K\s*리그|FA컵|MLB|KBO|NPB|NBA|KBL|WKBL|V리그|LCK|LPL|LCS|LEC)\s+/gi, "");
  // 하이라이트/H_L/highlights 류 + 그 뒤의 모든 잡문자 제거
  s = s.replace(/\s*(하이라이트|H[\s\/.]*L|highlights?|골\s*모음|골\s*장면|풀\s*경기|풀\s*매치|FULL\s*MATCH).*$/gi, "");
  // LCK/LOL 매치 번호 (예: "매치67", "match 5")
  s = s.replace(/\s*매치\s*\d+.*$/g, "");
  s = s.replace(/\s*match\s*\d+.*$/gi, "");
  // 라운드/세트/회차/일자 패턴
  s = s.replace(/\s*\d+\s*세트.*$/gi, "");
  s = s.replace(/\s*\d+\s*R\s*.*$/gi, "");
  s = s.replace(/\s*\d+R\s*.*$/gi, "");
  s = s.replace(/\s*\d+회.*$/g, "");
  // 파이프/슬래시 등 구분자 이후 잡문자
  s = s.replace(/\s*[|｜/].*$/g, "");
  // 퓨처스리그 " I", " II" 잔재
  s = s.replace(/\s+I{1,2}(\s+.*)?$/g, "");
  // 대괄호 잔재
  s = s.replace(/\[[^\]]*\]/g, "");
  return s.trim();
}

function parseVideoTitle(title: string): { category: string; league: string; homeTeam: string; awayTeam: string; isHighlight: boolean } {
  let category = "etc";
  let league = "";
  let homeTeam = "";
  let awayTeam = "";
  const isHighlight = /하이라이트|H\/L|골장면|골 모음/.test(title);

  // 리그 감지
  for (const [key, cat] of Object.entries(LEAGUE_CATEGORY)) {
    if (title.includes(key)) {
      category = cat;
      league = key;
      // [25/26 세리에A] 같은 대괄호 패턴에서 구체적 리그명
      const bracketMatch = title.match(/\[(?:\d+\/\d+\s+)?([^\]]+)\]/);
      if (bracketMatch) {
        league = bracketMatch[1].trim();
      }
      break;
    }
  }

  // "A vs B" 패턴 — 스포츠 리그가 감지된 경우에만 추출
  if (category !== "etc") {
    const simpleVs = title.match(/([가-힣A-Za-z0-9\s.]+?)\s+vs\s+([가-힣A-Za-z0-9\s.]+)/i);
    if (simpleVs) {
      homeTeam = simpleVs[1].replace(/^\[.*?\]\s*/, "").replace(/\d+R\s*/, "").replace(/^R\s+/, "").trim();
      awayTeam = simpleVs[2].replace(/\s*[｜|].*/g, "").replace(/\s*\d+분.*/, "").replace(/^R\s+/, "").trim();
    }
  }

  // 노이즈 제거 (하이라이트/리그명/매치번호/구분자 등)
  homeTeam = sanitizeTeamName(homeTeam);
  awayTeam = sanitizeTeamName(awayTeam);

  return { category, league, homeTeam, awayTeam, isHighlight };
}

// 채널별 핸들(YouTube @handle) 매핑
const CHANNEL_HANDLES: Record<string, string> = {
  "UCtm_QoN2SIxwCE-59shX7Qg": "SPOTV",
  "UCoVz66yWHzVsXAFG8WhJK9g": "KBO",
  "UC8JtQf77wqhVpOQ8Cze8JjA": "tvingsports",
  "UCtybqqaTj6Nx74Azdz1KrsA": "tvNSPORTS",
  "UCw1DsweY9b2AKGjV4kGJP1A": "LCK",
};

function applyChannelOverrides(channelId: string, title: string, parsed: { category: string; league: string; homeTeam: string; awayTeam: string; isHighlight: boolean }) {
  let { category, league, homeTeam, awayTeam } = parsed;
  const { isHighlight } = parsed;

  if (channelId === "UCoVz66yWHzVsXAFG8WhJK9g") {
    category = "baseball";
    league = "KBO";
  }
  if (channelId === "UC8JtQf77wqhVpOQ8Cze8JjA") {
    if (/프로농구|LG전자/.test(title)) { category = "basketball"; league = "KBL"; }
    else if (/KBO|시범경기/.test(title)) { category = "baseball"; league = "KBO"; }
  }
  if (channelId === "UCtybqqaTj6Nx74Azdz1KrsA") {
    if (/UFC|격투|파이트|챔피언십|녹아웃|KO/.test(title)) { category = "ufc"; if (!league) league = "UFC"; }
  }
  if (channelId === "UCw1DsweY9b2AKGjV4kGJP1A") {
    // LOL은 "매치/match"가 포함된 영상만 파싱
    if (!/매치|match/i.test(title)) return { category: "", league: "", homeTeam: "", awayTeam: "", isHighlight: false };
    category = "lol";
    if (!league) league = "LCK";
  }

  if (!homeTeam) {
    const kboMatch = title.match(/\[([가-힣A-Za-z]+)\s+vs\s+([가-힣A-Za-z]+)\]/i);
    if (kboMatch) { homeTeam = kboMatch[1]; awayTeam = kboMatch[2]; }
  }

  // KBL 약어 → 풀네임 변환 (KBO와 로고 충돌 방지)
  if (category === "basketball" && (league === "KBL" || /프로농구|KBL/.test(title))) {
    const KBL_NAMES: Record<string, string> = {
      "LG": "창원 LG", "KT": "수원 KT", "삼성": "서울 삼성", "SK": "서울 SK",
      "DB": "원주 DB", "KCC": "부산 KCC", "현대모비스": "울산 현대모비스",
      "가스공사": "대구 한국가스공사", "한국가스공사": "대구 한국가스공사", "정관장": "안양 정관장", "소노": "고양 소노",
    };
    if (KBL_NAMES[homeTeam]) homeTeam = KBL_NAMES[homeTeam];
    if (KBL_NAMES[awayTeam]) awayTeam = KBL_NAMES[awayTeam];
  }

  // 최종 sanitize (override 단계에서 추가된 KBO 패턴 등에도 정규화 적용)
  homeTeam = sanitizeTeamName(homeTeam);
  awayTeam = sanitizeTeamName(awayTeam);

  return { category, league, homeTeam, awayTeam, isHighlight };
}

function buildVideoObj(id: string, title: string, channel: string, published: string, thumbnail: string, overrides: { category: string; league: string; homeTeam: string; awayTeam: string; isHighlight: boolean }): YouTubeVideo | null {
  if (!overrides.homeTeam || !overrides.awayTeam) return null;
  // 티저/예고/비스포츠 영상 제외
  if (/티저|teaser|예고편/i.test(title)) return null;
  if (/버티기|먹방|브이로그|vlog|예능|챌린지|겟인더|리액션|몰래카메라|꿀잼|드라마|김민|나지완|레전드 대결|선수 대결|꿀잼 대결|VS 특집|얼굴|나이|키 차이|신체|밸런스 게임|퀴즈|인터뷰|비하인드|behind/i.test(title)) return null;
  // 선수 1:1 매치업/특집 차단 — 정상 경기 영상과 혼동 안 되도록 특정 키워드 + 사용자 지정 매치업
  if (/김혜성.*페라자|페라자.*김혜성/i.test(title)) return null;
  if (/1\s*[:vs:]\s*1|1\s*대\s*1|맞\s*대결|정면\s*승부|직접\s*대결|타격\s*대결|구속\s*대결|선수\s*매치업|특집\s*매치/i.test(title)) return null;
  // 카테고리가 etc인데 하이라이트도 아닌 경우 제외
  if (overrides.category === "etc" && !overrides.isHighlight) return null;

  const publishedDate = published ? new Date(published) : new Date();
  const diffMs = Date.now() - publishedDate.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let publishedTime = "";
  if (diffHours < 1) publishedTime = "방금 전";
  else if (diffHours < 24) publishedTime = `${diffHours}시간 전`;
  else if (diffDays < 7) publishedTime = `${diffDays}일 전`;
  else publishedTime = `${publishedDate.getMonth() + 1}월 ${publishedDate.getDate()}일`;

  const publishedDateStr = `${String(publishedDate.getMonth() + 1).padStart(2, "0")}월 ${String(publishedDate.getDate()).padStart(2, "0")}일`;

  return {
    id, title, channel, views: "", publishedTime, publishedDate: publishedDateStr,
    publishedAt: publishedDate.getTime(),
    thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hq720.jpg`,
    ...overrides,
  };
}

// YouTube API로 가져오기
async function fetchChannelVideosAPI(channelId: string, maxResults: number): Promise<YouTubeVideo[]> {
  const apiKey = await getYoutubeKey();
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&part=snippet&type=video&order=date&maxResults=${maxResults}&regionCode=KR&key=${apiKey}`,
    { next: { revalidate: 1800 } }
  );
  if (!res.ok) throw new Error(`API ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  if (data?.error) throw new Error(data.error.message);

  const items = data?.items ?? [];
  const videos: YouTubeVideo[] = [];

  for (const item of items) {
    const id = item?.id?.videoId;
    const snippet = item?.snippet;
    if (!id || !snippet) continue;

    const title = (snippet.title ?? "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const channel = snippet.channelTitle ?? "";
    const published = snippet.publishedAt ?? "";
    const parsed = parseVideoTitle(title);
    const overrides = applyChannelOverrides(channelId, title, parsed);
    const thumbnail = snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? "";
    const video = buildVideoObj(id, title, channel, published, thumbnail, overrides);
    if (video) videos.push(video);
  }
  return videos;
}

// 스크래핑 폴백: ytInitialData에서 영상 추출
async function fetchChannelVideosScrape(channelId: string, maxResults: number): Promise<YouTubeVideo[]> {
  const handle = CHANNEL_HANDLES[channelId] ?? channelId;
  const url = `https://www.youtube.com/@${handle}/videos`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    next: { revalidate: 1800 },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start === -1) return [];
  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf(";</script>", jsonStart);
  if (jsonEnd === -1) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = JSON.parse(html.slice(jsonStart, jsonEnd));

  // 채널 videos 탭에서 영상 목록 추출
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videosTab = tabs.find((t: any) => t?.tabRenderer?.title === "동영상" || t?.tabRenderer?.title === "Videos");
  const items = videosTab?.tabRenderer?.content?.richGridRenderer?.contents ?? [];

  // 채널명 추출
  const channelName = data?.metadata?.channelMetadataRenderer?.title ?? handle;

  const videos: YouTubeVideo[] = [];
  for (const item of items) {
    if (videos.length >= maxResults) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vr = (item as any)?.richItemRenderer?.content?.videoRenderer;
    if (!vr?.videoId) continue;

    const id: string = vr.videoId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const title: string = (vr.title?.runs ?? []).map((r: any) => r.text).join("") || "";
    const publishedText: string = vr.publishedTimeText?.simpleText ?? "";

    const parsed = parseVideoTitle(title);
    const overrides = applyChannelOverrides(channelId, title, parsed);
    const thumbnail = `https://i.ytimg.com/vi/${id}/hq720.jpg`;

    // publishedText를 ISO 날짜로 근사 변환
    let publishedISO = "";
    if (/(\d+)시간 전/.test(publishedText)) {
      const h = parseInt(RegExp.$1);
      publishedISO = new Date(Date.now() - h * 3600000).toISOString();
    } else if (/(\d+)일 전/.test(publishedText)) {
      const d = parseInt(RegExp.$1);
      publishedISO = new Date(Date.now() - d * 86400000).toISOString();
    } else if (/(\d+)주 전/.test(publishedText)) {
      const w = parseInt(RegExp.$1);
      publishedISO = new Date(Date.now() - w * 7 * 86400000).toISOString();
    } else if (/(\d+)개월 전/.test(publishedText)) {
      const m = parseInt(RegExp.$1);
      publishedISO = new Date(Date.now() - m * 30 * 86400000).toISOString();
    } else {
      publishedISO = new Date().toISOString();
    }

    const video = buildVideoObj(id, title, channelName, publishedISO, thumbnail, overrides);
    if (video) videos.push(video);
  }
  return videos;
}

async function fetchChannelVideos(channelId: string, maxResults: number): Promise<YouTubeVideo[]> {
  try {
    // API 먼저 시도
    return await fetchChannelVideosAPI(channelId, maxResults);
  } catch {
    // API 실패 시 (할당량 초과 등) 스크래핑 폴백
    try {
      return await fetchChannelVideosScrape(channelId, maxResults);
    } catch {
      return [];
    }
  }
}

export async function fetchSPOTVHighlights(maxResults = 30): Promise<YouTubeVideo[]> {
  // 모든 채널에서 충분히 가져오기 (최신순 정렬을 위해 채널당 최소 5개)
  const perChannel = Math.max(5, Math.ceil(maxResults / HIGHLIGHT_CHANNELS.length));
  const results = await Promise.allSettled(
    HIGHLIGHT_CHANNELS.map((ch) => fetchChannelVideos(ch.id, perChannel))
  );

  const allVideos: YouTubeVideo[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allVideos.push(...result.value);
    }
  }

  // 업로드 시간 기준 최신순 정렬
  allVideos.sort((a, b) => b.publishedAt - a.publishedAt);

  return allVideos.slice(0, maxResults);
}

export async function fetchHighlightsByCategory(category?: string): Promise<YouTubeVideo[]> {
  const all = await fetchSPOTVHighlights(30);
  if (!category || category === "all") return all;
  return all.filter((v) => v.category === category);
}

export async function fetchYouTubeHighlights(): Promise<YouTubeVideo[]> {
  return fetchSPOTVHighlights(5);
}

// 기존 검색 기능 유지 (폴백)
export async function fetchYouTubeSearch(query: string, maxResults = 5): Promise<YouTubeVideo[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodedQuery}&sp=CAMSBAgCEAE%253D`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        next: { revalidate: 1800 },
      }
    );

    if (!res.ok) return [];
    const html = await res.text();
    const marker = "var ytInitialData = ";
    const start = html.indexOf(marker);
    if (start === -1) return [];
    const jsonStart = start + marker.length;
    const jsonEnd = html.indexOf(";</script>", jsonStart);
    if (jsonEnd === -1) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = JSON.parse(html.slice(jsonStart, jsonEnd));
    const items: unknown[] =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents ?? [];

    const videos: YouTubeVideo[] = [];
    for (const item of items) {
      if (videos.length >= maxResults) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vr = (item as any)?.videoRenderer;
      if (!vr?.videoId) continue;

      const id: string = vr.videoId;
      const title: string = vr.title?.runs?.[0]?.text ?? "";
      const channel: string = vr.ownerText?.runs?.[0]?.text ?? "";
      const views: string = vr.viewCountText?.simpleText ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vr.viewCountText?.runs ?? []).map((r: any) => r.text).join("") ?? "";
      const publishedTime: string = vr.publishedTimeText?.simpleText ?? "";
      const thumbnails: { url: string }[] = vr.thumbnail?.thumbnails ?? [];
      const thumbnail = thumbnails[thumbnails.length - 1]?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      if (!title) continue;
      videos.push({
        id, title, channel, views, publishedTime, publishedDate: "", publishedAt: 0, thumbnail,
        category: "etc", league: "", homeTeam: "", awayTeam: "", isHighlight: true,
      });
    }
    return videos;
  } catch {
    return [];
  }
}
