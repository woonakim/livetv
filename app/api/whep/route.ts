import { NextRequest, NextResponse } from "next/server";

const SRS_WHEP = "http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream";

export async function POST(req: NextRequest) {
  const sdp = await req.text();

  const res = await fetch(SRS_WHEP, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: sdp,
  });

  const answer = await res.text();
  return new NextResponse(answer, {
    status: res.status,
    headers: { "Content-Type": "application/sdp" },
  });
}
