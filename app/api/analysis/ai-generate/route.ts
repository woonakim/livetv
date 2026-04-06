export const dynamic = "force-dynamic";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";


function buildPrompt(sport: string, league: string, homeTeam: string, awayTeam: string, homeRecord: string, awayRecord: string) {
  const sportName: Record<string, string> = {
    soccer: "축구", baseball: "야구", basketball: "농구", hockey: "하키", volleyball: "배구",
  };
  return `다음 ${sportName[sport] || "스포츠"} 경기에 대한 분석글을 한국어로 작성해주세요.

경기 정보:
- 리그: ${league || "미정"}
- 홈팀: ${homeTeam} ${homeRecord ? `(${homeRecord})` : ""}
- 원정팀: ${awayTeam} ${awayRecord ? `(${awayRecord})` : ""}

아래 마크다운 서식을 정확히 따라주세요:
- ## 으로 소제목
- - **굵은텍스트** 으로 리스트
- **굵은텍스트** 으로 강조
- 일반 텍스트로 문단

다음 구조로 작성해주세요:
1. 먼저 경기 소개를 한두 문장으로 간략하게
2. ## 경기 핵심 포인트 — 3개의 핵심 분석 포인트를 리스트로
3. ## 전술 / 데이터 분석 — 양 팀의 전술, 최근 폼, 강점/약점을 2~3문단으로
4. ## 분석 결론 — 종합 분석, 추천 픽, 대안 픽, 예상 스코어를 포함

전문 스포츠 분석가 수준의 통찰력 있는 분석을 해주세요. 총 분량은 400~600자 정도로 간결하게 작성해주세요.`;
}

function sseEncode(data: object) {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamAnthropic(apiKey: string, prompt: string): Promise<ReadableStream> {
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(sseEncode({ text: event.delta.text }));
          }
        }
        controller.enqueue(sseEncode({ done: true }));
        controller.close();
      } catch (e: unknown) {
        controller.enqueue(sseEncode({ error: `Claude 오류: ${e instanceof Error ? e.message : e}` }));
        controller.close();
      }
    },
  });
}

async function streamOpenAI(apiKey: string, prompt: string): Promise<ReadableStream> {
  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) controller.enqueue(sseEncode({ text }));
        }
        controller.enqueue(sseEncode({ done: true }));
        controller.close();
      } catch (e: unknown) {
        controller.enqueue(sseEncode({ error: `GPT 오류: ${e instanceof Error ? e.message : e}` }));
        controller.close();
      }
    },
  });
}

async function streamGemini(apiKey: string, prompt: string): Promise<ReadableStream> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContentStream(prompt);
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(sseEncode({ text }));
        }
        controller.enqueue(sseEncode({ done: true }));
        controller.close();
      } catch (e: unknown) {
        controller.enqueue(sseEncode({ error: `Gemini 오류: ${e instanceof Error ? e.message : e}` }));
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  if (!["PICKSTER", "ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const { sport, league, homeTeam, awayTeam, homeRecord, awayRecord, provider } = body;

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ error: "팀 정보를 먼저 입력해주세요" }, { status: 400 });
  }

  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  const prompt = buildPrompt(sport, league, homeTeam, awayTeam, homeRecord, awayRecord);

  try {
    let readable: ReadableStream;

    if (provider === "openai") {
      const key = settings?.openaiApiKey || "";
      if (!key) return NextResponse.json({ error: "OpenAI API 키가 설정되지 않았습니다" }, { status: 500 });
      readable = await streamOpenAI(key, prompt);
    } else if (provider === "gemini") {
      const key = settings?.geminiApiKey || "";
      if (!key) return NextResponse.json({ error: "Gemini API 키가 설정되지 않았습니다" }, { status: 500 });
      readable = await streamGemini(key, prompt);
    } else {
      const key = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
      if (!key) return NextResponse.json({ error: "Anthropic API 키가 설정되지 않았습니다" }, { status: 500 });
      readable = await streamAnthropic(key, prompt);
    }

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai-generate error]", msg);
    return NextResponse.json({ error: `AI 생성 실패: ${msg}` }, { status: 500 });
  }
}
