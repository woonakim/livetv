export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchSportsLiveData } from "@/lib/sports-live";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") || "";

  try {
    const result = await fetchSportsLiveData(sport);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ live: [], waiting: [] });
  }
}
