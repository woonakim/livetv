export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

export async function GET() {
  let lastId = 0;

  // 현재 마지막 메시지 ID 기준 설정
  const latest = await prisma.chatMessage.findFirst({ orderBy: { id: "desc" } });
  if (latest) lastId = latest.id;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: string) => {
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch {
          clearInterval(interval);
        }
      };

      // 연결 확인용 초기 ping
      enqueue(": ping\n\n");

      const interval = setInterval(async () => {
        try {
          const messages = await prisma.chatMessage.findMany({
            where: { id: { gt: lastId } },
            orderBy: { createdAt: "asc" },
          });

          if (messages.length > 0) {
            lastId = messages[messages.length - 1].id;
            for (const msg of messages) {
              enqueue(`data: ${JSON.stringify(msg)}\n\n`);
            }
          } else {
            enqueue(": ping\n\n");
          }
        } catch {
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
