export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const SRS_WHEP = "http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sdp = await req.text();
  if (!sdp || sdp.length > 100_000) {
    return new NextResponse("Invalid SDP", { status: 400 });
  }

  const res = await fetch(SRS_WHEP, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: sdp,
    signal: AbortSignal.timeout(10000),
  });

  const answer = await res.text();
  return new NextResponse(answer, {
    status: res.status,
    headers: { "Content-Type": "application/sdp" },
  });
}
