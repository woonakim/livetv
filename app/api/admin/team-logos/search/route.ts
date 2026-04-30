export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface Candidate {
  name: string;
  imageUrl: string;
  source: "thesportsdb" | "wikipedia";
  description?: string;
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
