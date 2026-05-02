export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface Candidate {
  name: string;
  imageUrl: string;
  source: "thesportsdb" | "wikipedia";
  description?: string;
}

// 한글/특수문자/공백 제거 후 소문자 비교 — 양방향 부분 일치
function normalizeForMatch(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\s.()[\]{}'"`’&\-_/\\,!?]/g, "")
    .trim();
}
function nameMatchesQuery(query: string, teamName: string): boolean {
  const q = normalizeForMatch(query);
  const t = normalizeForMatch(teamName);
  if (!q || !t) return false;
  // 한쪽이 다른 쪽 포함하면 매치 (e.g. "Burnley" ↔ "Burnley FC")
  if (t.includes(q) || q.includes(t)) return true;
  // 토큰 단위 일치 — 쿼리의 모든 토큰이 팀명에 등장해야 함
  const qTokens = query.toLowerCase().split(/\s+/).filter(x => x.length >= 2).map(x => x.replace(/[.()[\]'"`’&\-_/\\,!?]/g, ""));
  if (qTokens.length === 0) return false;
  return qTokens.every(tok => t.includes(tok));
}

async function searchTheSportsDB(query: string): Promise<Candidate[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000), cache: "no-store" }
    );
    if (!res.ok) return [];
    const j = await res.json();
    if (!j.teams) return [];
    return j.teams
      .map((t: Record<string, string>) => {
        const badge = t.strBadge || t.strTeamBadge || t.strLogo;
        if (!badge) return null;
        // 무료 API는 매칭 실패 시 Arsenal 등 fallback을 던지는 경우가 있음
        // → 결과의 strTeam이 검색어와 실제 매칭되는지 검증
        if (!nameMatchesQuery(query, t.strTeam || "")) return null;
        return {
          name: t.strTeam || "",
          imageUrl: badge,
          source: "thesportsdb" as const,
          description: `${t.strSport || ""}${t.strLeague ? " / " + t.strLeague : ""}${t.strCountry ? " (" + t.strCountry + ")" : ""}`,
        };
      })
      .filter((c: Candidate | null): c is Candidate => c !== null)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function searchWikipedia(query: string): Promise<Candidate[]> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json`,
      { signal: AbortSignal.timeout(10000), cache: "no-store" }
    );
    if (!searchRes.ok) return [];
    const arr = await searchRes.json();
    const titles: string[] = Array.isArray(arr) && arr[1] ? arr[1] : [];
    const descs: string[] = Array.isArray(arr) && arr[2] ? arr[2] : [];

    const candidates: Candidate[] = [];
    for (let i = 0; i < Math.min(titles.length, 5); i++) {
      const title = titles[i].replace(/ /g, "_");
      // 검색어와 무관한 결과 컷 — 토큰 일치 검증
      if (!nameMatchesQuery(query, titles[i])) continue;
      try {
        const sumRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { signal: AbortSignal.timeout(10000), cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
        );
        if (!sumRes.ok) continue;
        const sum = await sumRes.json();
        const img = (sum.originalimage || sum.thumbnail || {}).source;
        if (!img) continue;
        candidates.push({
          name: titles[i],
          imageUrl: img,
          source: "wikipedia",
          description: descs[i] || sum.description || "",
        });
      } catch {
        continue;
      }
    }
    return candidates;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ candidates: [] });

  const [tsdb, wiki] = await Promise.all([searchTheSportsDB(query), searchWikipedia(query)]);
  return NextResponse.json({ candidates: [...tsdb, ...wiki] });
}
