import { NextResponse } from "next/server";

const SRS_API = "http://localhost:1985/api/v1/streams";

export async function GET() {
  try {
    const res = await fetch(SRS_API, { cache: "no-store" });
    const data = await res.json();

    const streams: { name?: string; clients?: number }[] = data?.streams ?? [];
    const activeStream = streams.find((s) => (s.clients ?? 0) > 0 || s.name);

    if (activeStream) {
      return NextResponse.json({
        isLive: true,
        streamUrl: `/api/hls/live/${activeStream.name ?? "livestream"}.m3u8`,
      });
    }

    return NextResponse.json({ isLive: false });
  } catch {
    return NextResponse.json({ isLive: false });
  }
}
