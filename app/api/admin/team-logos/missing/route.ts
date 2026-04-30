export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseGalaxyResponse, SPORTS_LIVE_API_URL } from "@/lib/sports-live";
import { getSession } from "@/lib/auth";
import { stripChannelSuffix } from "@/lib/team-name";

interface MissingTeam {
  team: string;
  sport: string;
  leagues: string[];
  source: "broadcast" | "youtube" | "both";
}

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. 로고 맵 구성 (team-logos API와 동일 로직)
  const teams = await prisma.teamLogo.findMany({
    where: { isActive: true },
    select: { nameKr: true, nameEn: true, sport: true, logoPath: true },
  });
  const keyset = new Set<string>();
  for (const t of teams) {
    if (!t.logoPath) continue;
    const variants = new Set<string>([t.nameKr, t.nameKr.replace(/\s/g, "")]);
    if (t.nameEn) {
      variants.add(t.nameEn);
      variants.add(t.nameEn.replace(/\s/g, ""));
    }
    variants.forEach((v) => {
      keyset.add(v);
      if (t.sport) keyset.add(`${t.sport}:${v}`);
    });
  }
  // 클라이언트와 동일한 공백/채널 suffix 차이 허용 (조회 시도)
  const tryMatch = (name: string, sport: string) => {
    const candidates = new Set<string>([name, name.replace(/\s/g, "")]);
    const stripped = stripChannelSuffix(name);
    if (stripped && stripped !== name) {
      candidates.add(stripped);
      candidates.add(stripped.replace(/\s/g, ""));
    }
    for (const c of Array.from(candidates)) {
      if (keyset.has(c) || keyset.has(`${sport}:${c}`)) return true;
    }
    return false;
  };

  const missingMap = new Map<string, MissingTeam>();

  // 2. 중계 데이터 스캔
  try {
    const res = await fetch(SPORTS_LIVE_API_URL, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://livetv.galaxy-stream.live/",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const parsed = parseGalaxyResponse(json);
      const all = [...parsed.live, ...parsed.waiting];
      for (const g of all) {
        for (const team of [g.home, g.away]) {
          if (!team) continue;
          if (tryMatch(team, g.sport)) continue;
          const key = `${team}|${g.sport}`;
          const existing = missingMap.get(key);
          if (existing) {
            if (!existing.leagues.includes(g.league)) existing.leagues.push(g.league);
          } else {
            missingMap.set(key, { team, sport: g.sport, leagues: [g.league], source: "broadcast" });
          }
        }
      }
    }
  } catch (e) {
    console.warn("[admin/team-logos/missing] broadcast scan failed:", e);
  }

  // 3. 유튜브 하이라이트 스캔
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/highlights`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const list: Array<{ homeTeam?: string; awayTeam?: string; category?: string; league?: string }> = await res.json();
      for (const g of list) {
        const sport = g.category || "";
        for (const team of [g.homeTeam, g.awayTeam]) {
          if (!team) continue;
          if (tryMatch(team, sport)) continue;
          const key = `${team}|${sport}`;
          const existing = missingMap.get(key);
          if (existing) {
            if (g.league && !existing.leagues.includes(g.league)) existing.leagues.push(g.league);
            existing.source = existing.source === "broadcast" ? "both" : "youtube";
          } else {
            missingMap.set(key, { team, sport, leagues: g.league ? [g.league] : [], source: "youtube" });
          }
        }
      }
    }
  } catch (e) {
    console.warn("[admin/team-logos/missing] youtube scan failed:", e);
  }

  // 중계 전용 플레이스홀더 (채널명 등) 필터: "2026 LCK", "2026 LPL" 등
  const missing = Array.from(missingMap.values())
    .filter((m) => !/^\d{4}\s+[A-Z]{2,}$/.test(m.team));

  return NextResponse.json({
    count: missing.length,
    teams: missing.sort((a, b) => a.sport.localeCompare(b.sport) || a.team.localeCompare(b.team)),
  });
}
