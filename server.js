const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // 접속자 수 추적
  let onlineCount = 0;

  io.on("connection", (socket) => {
    onlineCount++;
    io.emit("online:count", onlineCount);

    // 최근 메시지 50개 + 고정 메시지 전송
    Promise.all([
      prisma.chatMessage.findMany({ orderBy: { createdAt: "asc" }, take: 50 }),
      prisma.chatMessage.findMany({ where: { isPinned: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    ])
      .then(([messages, pinned]) => {
        socket.emit("chat:init", messages);
        socket.emit("chat:pinned", pinned);
      })
      .catch(() => {});

    // 메시지 수신 → DB에서 최신 role 조회 → 저장 → 브로드캐스트
    socket.on("chat:send", async ({ userId, nickname, text }) => {
      if (!text || !text.trim() || text.trim().length > 100) return;
      try {
        // DB에서 최신 role + exp 가져오기
        const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, nickname: true, exp: true } }) : null;
        const latestRole = user?.role || "USER";
        const latestNickname = user?.nickname || nickname;

        // 레벨 계산
        const levelSettings = await prisma.levelSetting.findMany({ orderBy: { level: "asc" } });
        let userLevel = 0;
        for (const s of levelSettings) {
          if ((user?.exp || 0) >= s.requiredExp) userLevel = s.level;
          else break;
        }

        const msg = await prisma.chatMessage.create({
          data: {
            userId,
            nickname: latestNickname,
            role: latestRole,
            level: userLevel,
            text: text.trim(),
          },
        });
        io.emit("chat:message", msg);
      } catch (e) {
        console.error("chat:send error", e);
      }
    });

    // 관리자 메시지 삭제
    socket.on("chat:delete", async ({ msgId, role }) => {
      if (role !== "ADMIN" && role !== "SUPERADMIN") return;
      try {
        await prisma.chatMessage.delete({ where: { id: msgId } });
        io.emit("chat:deleted", msgId);
      } catch (e) {
        console.error("chat:delete error", e);
      }
    });

    // 관리자 메시지 고정/해제
    socket.on("chat:pin", async ({ msgId, pin, role }) => {
      if (role !== "ADMIN" && role !== "SUPERADMIN") return;
      try {
        if (pin) {
          const count = await prisma.chatMessage.count({ where: { isPinned: true } });
          if (count >= 3) return;
        }
        await prisma.chatMessage.update({
          where: { id: msgId },
          data: { isPinned: !!pin },
        });
        const pinned = await prisma.chatMessage.findMany({
          where: { isPinned: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        });
        io.emit("chat:pinned", pinned);
      } catch (e) {
        console.error("chat:pin error", e);
      }
    });

    socket.on("disconnect", () => {
      onlineCount = Math.max(0, onlineCount - 1);
      io.emit("online:count", onlineCount);
    });
  });

  httpServer.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });
});
