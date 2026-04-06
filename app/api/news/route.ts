import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GNEWS_BASE = "https://gnews.io/api/v4";

let cachedGnewsKey: { key: string; ts: number } | null = null;
async function getGnewsKey(): Promise<string> {
  if (cachedGnewsKey && Date.now() - cachedGnewsKey.ts < 600000) return cachedGnewsKey.key;
  const s = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  const key = s?.gnewsApiKey || "f080b569c6713b091aee473593fe177b"; // fallback
  cachedGnewsKey = { key, ts: Date.now() };
  return key;
}

/* ── 종목별 검색 키워드 ── */
const SPORT_QUERIES = [
  { id: "sports",    keyword: "",                                           label: "스포츠",  emoji: "🏆" },
  { id: "soccer",    keyword: "축구 OR EPL OR 챔피언스리그 OR K리그 OR 라리가", label: "축구",    emoji: "⚽" },
  { id: "baseball",  keyword: "야구 OR KBO OR MLB OR 홈런 OR 선발투수",       label: "야구",    emoji: "⚾" },
  { id: "basketball",keyword: "농구 OR NBA OR KBL",                          label: "농구",    emoji: "🏀" },
  { id: "volleyball", keyword: "배구 OR V리그",                               label: "배구",    emoji: "🏐" },
  { id: "ufc",       keyword: "UFC OR 격투기 OR 종합격투",                     label: "UFC",     emoji: "🥊" },
];

/* ── 캐시: 종목별 개별 캐시 (2시간 TTL) ── */
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2시간

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  image: string | null;
  category: string;
  summary: string;
}

interface CacheEntry {
  data: NewsItem[];
  ts: number;
}

const cache: Record<string, CacheEntry> = {};

/* ── GNews API 호출 ── */
async function fetchFromGNews(sportQuery: typeof SPORT_QUERIES[0]): Promise<NewsItem[]> {
  const apiKey = await getGnewsKey();
  let url: string;

  if (!sportQuery.keyword) {
    url = `${GNEWS_BASE}/top-headlines?category=sports&lang=ko&country=kr&max=10&apikey=${apiKey}`;
  } else {
    url = `${GNEWS_BASE}/search?q=${encodeURIComponent(sportQuery.keyword)}&lang=ko&country=kr&max=10&apikey=${apiKey}`;
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error(`[news] GNews API error for ${sportQuery.id}: ${res.status}`);
    return [];
  }
  console.info(`[news] GNews OK for ${sportQuery.id}`);

  const data = await res.json();
  const articles: Array<{
    title: string;
    url: string;
    publishedAt: string;
    source: { name: string };
    image: string | null;
    description: string;
  }> = data.articles ?? [];

  return articles.map((article) => ({
    title: article.title,
    link: article.url,
    pubDate: article.publishedAt,
    source: article.source?.name ?? "뉴스",
    image: article.image ?? null,
    category: `${sportQuery.emoji} ${sportQuery.label}`,
    summary: article.description ?? "",
  }));
}

/* ── 전체 뉴스 가져오기 (캐시 활용) ── */
async function getAllNews(): Promise<NewsItem[]> {
  const now = Date.now();
  const allItems: NewsItem[] = [];
  const fetchPromises: Promise<void>[] = [];

  for (const sq of SPORT_QUERIES) {
    const cached = cache[sq.id];

    if (cached && now - cached.ts < CACHE_TTL) {
      // 캐시 유효 → 캐시 데이터 사용
      allItems.push(...cached.data);
    } else {
      // 캐시 만료 → API 호출 (순차적으로 하나씩, 시간차)
      fetchPromises.push(
        fetchFromGNews(sq).then((items) => {
          cache[sq.id] = { data: items, ts: Date.now() };
          allItems.push(...items);
        }).catch(() => {
          // 실패 시 이전 캐시가 있으면 그대로 사용
          if (cached) allItems.push(...cached.data);
        })
      );
    }
  }

  // 만료된 카테고리만 병렬 fetch
  if (fetchPromises.length > 0) {
    await Promise.allSettled(fetchPromises);
  }

  // 중복 제거 (같은 제목)
  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });

  // 최신순 정렬
  unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return unique.slice(0, 40);
}

/* ── API Route ── */
export async function GET() {
  try {
    const news = await getAllNews();
    return NextResponse.json(news);
  } catch {
    // 전체 실패 시 캐시에서 모아서 반환
    const fallback: NewsItem[] = [];
    for (const sq of SPORT_QUERIES) {
      if (cache[sq.id]) fallback.push(...cache[sq.id].data);
    }
    return NextResponse.json(fallback, { status: 500 });
  }
}
