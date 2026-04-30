const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "livetv-jwt-secret-key-change-in-production";

function getUserFromSocket(socket) {
  try {
    const cookie = socket.handshake.headers.cookie || "";
    const match = cookie.match(/livetv_token=([^;]+)/);
    if (!match) return null;
    const decoded = jwt.verify(match[1], JWT_SECRET);
    return { id: decoded.id, role: decoded.role, nickname: decoded.nickname };
  } catch {
    return null;
  }
}

async function getUserLevel(userId) {
  if (!userId) return 0;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { exp: true } });
  const levels = await prisma.levelSetting.findMany({ orderBy: { level: "asc" } });
  let lv = 0;
  for (const s of levels) {
    if ((user?.exp || 0) >= s.requiredExp) lv = s.level;
    else break;
  }
  return lv;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: [
        "https://livefelix.com", "https://www.livefelix.com",
        "https://livetv-01.com", "https://www.livetv-01.com",
        "https://livetv-02.com", "https://www.livetv-02.com",
        "https://livetv-03.com", "https://www.livetv-03.com",
        "http://localhost:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  let onlineCount = 0;

  // 관리자 알림 함수 (외부에서 호출 가능하도록 global에 노출)
  // 1) 사이트 내 알림 (socket.io) — 즉시
  // 2) 텔레그램 봇 알림 — 비동기, SiteSetting의 telegramNotifyEnabled 시
  global.__adminNotify = function(type, data) {
    io.to("admin").emit("admin:notify", { type, data, ts: Date.now() });
    // 텔레그램은 fire-and-forget — 내부 API 호출
    const secret = process.env.INTERNAL_CRON_SECRET || "";
    fetch("http://localhost:3000/api/internal/telegram-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ type, data }),
    }).catch(() => {});
  };

  io.on("connection", (socket) => {
    onlineCount++;
    io.emit("online:count", onlineCount);

    // 관리자 room 참가
    socket.on("admin:join", () => {
      const auth = getUserFromSocket(socket);
      if (!auth) return;
      prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } }).then(user => {
        if (user && ["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(user.role)) {
          socket.join("admin");
        }
      });
    });

    // ═══════════════════════════════════════
    //  메인 공개 채팅 (기존)
    // ═══════════════════════════════════════
    Promise.all([
      prisma.chatMessage.findMany({ orderBy: { createdAt: "asc" }, take: 50 }),
      prisma.chatMessage.findMany({ where: { isPinned: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    ]).then(([messages, pinned]) => {
      socket.emit("chat:init", messages);
      socket.emit("chat:pinned", pinned);
    }).catch(() => {});

    socket.on("chat:send", async ({ userId, nickname, text }) => {
      if (!text || !text.trim() || text.trim().length > 100) return;
      try {
        const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, nickname: true, exp: true } }) : null;
        const level = await getUserLevel(userId);
        const msg = await prisma.chatMessage.create({
          data: { userId, nickname: user?.nickname || nickname, role: user?.role || "USER", level, text: text.trim() },
        });
        io.emit("chat:message", msg);
      } catch (e) { console.error("chat:send error", e); }
    });

    socket.on("chat:delete", async ({ msgId }) => {
      const auth = getUserFromSocket(socket);
      if (!auth) return;
      const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } });
      if (!user || !["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(user.role)) return;
      try {
        await prisma.chatMessage.delete({ where: { id: msgId } });
        io.emit("chat:deleted", msgId);
      } catch (e) { console.error("chat:delete error", e); }
    });

    socket.on("chat:pin", async ({ msgId, pin }) => {
      const auth = getUserFromSocket(socket);
      if (!auth) return;
      const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } });
      if (!user || !["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(user.role)) return;
      try {
        if (pin) { const count = await prisma.chatMessage.count({ where: { isPinned: true } }); if (count >= 3) return; }
        await prisma.chatMessage.update({ where: { id: msgId }, data: { isPinned: !!pin } });
        const pinned = await prisma.chatMessage.findMany({ where: { isPinned: true }, orderBy: { createdAt: "desc" }, take: 3 });
        io.emit("chat:pinned", pinned);
      } catch (e) { console.error("chat:pin error", e); }
    });

    // ═══════════════════════════════════════
    //  BJ 개별 채팅 (Socket.IO 전환)
    // ═══════════════════════════════════════
    socket.on("bj:join", async ({ bjId }) => {
      if (!bjId) return;
      const room = `bj:${bjId}`;
      socket.join(room);

      // 최근 100개 + 고정 메시지
      const [messages, pinnedMsg] = await Promise.all([
        prisma.bjChatMessage.findMany({ where: { bjProfileId: bjId }, orderBy: { createdAt: "asc" }, take: 100 }),
        prisma.bjChatMessage.findFirst({ where: { bjProfileId: bjId, isPinned: true } }),
      ]);
      socket.emit("bj:init", { messages, pinnedMsg });
    });

    socket.on("bj:leave", ({ bjId }) => {
      if (bjId) socket.leave(`bj:${bjId}`);
    });

    socket.on("bj:send", async ({ bjId, text, isSystem }) => {
      const auth = getUserFromSocket(socket);
      if (!auth || !bjId || !text?.trim()) return;
      const room = `bj:${bjId}`;

      try {
        // 시스템 메시지
        if (isSystem) {
          const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } });
          const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
          const isAdmin = ["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(user?.role || "");
          if (!isAdmin && bjProfile?.userId !== auth.id) return;
          const msg = await prisma.bjChatMessage.create({
            data: { bjProfileId: bjId, nickname: "시스템", role: "USER", level: 0, text: text.trim() },
          });
          io.to(room).emit("bj:message", msg);
          return;
        }

        // 차단 확인
        const ban = await prisma.bjChatBan.findUnique({
          where: { bjProfileId_userId: { bjProfileId: bjId, userId: auth.id } },
        });
        if (ban) { socket.emit("bj:error", { error: "채팅이 차단되었습니다" }); return; }

        const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true, nickname: true, exp: true } });
        const level = await getUserLevel(auth.id);
        const msg = await prisma.bjChatMessage.create({
          data: {
            bjProfileId: bjId, userId: auth.id,
            nickname: user?.nickname || auth.nickname || "",
            role: user?.role || "USER", level, text: text.trim(),
          },
        });
        io.to(room).emit("bj:message", msg);
      } catch (e) { console.error("bj:send error", e); }
    });

    socket.on("bj:delete", async ({ bjId, msgId }) => {
      const auth = getUserFromSocket(socket);
      if (!auth || !msgId) return;
      try {
        const message = await prisma.bjChatMessage.findUnique({ where: { id: msgId } });
        if (!message) return;
        const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } });
        const bjProfile = await prisma.bjProfile.findUnique({ where: { id: message.bjProfileId } });
        const isAdmin = ["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(user?.role || "");
        const isBjOwner = bjProfile?.userId === auth.id;
        const isManager = bjProfile ? await prisma.bjChatManager.findUnique({
          where: { bjProfileId_userId: { bjProfileId: bjProfile.id, userId: auth.id } },
        }) : null;
        if (!isAdmin && !isBjOwner && !isManager) return;

        await prisma.bjChatMessage.delete({ where: { id: msgId } });
        io.to(`bj:${message.bjProfileId}`).emit("bj:deleted", msgId);
      } catch (e) { console.error("bj:delete error", e); }
    });

    socket.on("bj:pin", async ({ bjId, msgId, pin }) => {
      const auth = getUserFromSocket(socket);
      if (!auth || !msgId) return;
      try {
        const message = await prisma.bjChatMessage.findUnique({ where: { id: msgId } });
        if (!message) return;
        const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } });
        const bjProfile = await prisma.bjProfile.findUnique({ where: { id: message.bjProfileId } });
        const isAdmin = ["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(user?.role || "");
        const isBjOwner = bjProfile?.userId === auth.id;
        const isManager = bjProfile ? await prisma.bjChatManager.findUnique({
          where: { bjProfileId_userId: { bjProfileId: bjProfile.id, userId: auth.id } },
        }) : null;
        if (!isAdmin && !isBjOwner && !isManager) return;

        if (pin) {
          await prisma.bjChatMessage.updateMany({ where: { bjProfileId: message.bjProfileId, isPinned: true }, data: { isPinned: false } });
        }
        await prisma.bjChatMessage.update({ where: { id: msgId }, data: { isPinned: !!pin } });
        const pinnedMsg = await prisma.bjChatMessage.findFirst({ where: { bjProfileId: message.bjProfileId, isPinned: true } });
        io.to(`bj:${message.bjProfileId}`).emit("bj:pinned", pinnedMsg);
      } catch (e) { console.error("bj:pin error", e); }
    });

    socket.on("disconnect", () => {
      onlineCount = Math.max(0, onlineCount - 1);
      io.emit("online:count", onlineCount);
    });
  });

  // ═══════════════════════════════════════
  //  자동 분석 Cron 스케줄러
  // ═══════════════════════════════════════
  let autoAnalysisCron = null;

  async function setupAutoAnalysisCron() {
    if (autoAnalysisCron) { autoAnalysisCron.stop(); autoAnalysisCron = null; }
    try {
      const settings = await prisma.autoAnalysisSetting.findFirst();
      if (!settings?.isEnabled) return;

      // KST → UTC 변환 (KST - 9 = UTC)
      let utcHour = settings.cronHour - 9;
      if (utcHour < 0) utcHour += 24;
      const cronExpr = `${settings.cronMinute} ${utcHour} * * *`;

      autoAnalysisCron = cron.schedule(cronExpr, async () => {
        console.log("[auto-analysis] Cron triggered at", new Date().toISOString());
        try {
          // 내부 API 호출로 실행
          const res = await fetch("http://localhost:3000/api/admin/auto-analysis", {
            method: "POST",
            headers: { Cookie: "" }, // 서버 내부 호출이므로 인증 우회 필요
          });
          // 인증 문제 시 직접 실행
          if (res.status === 403) {
            const { runAutoAnalysis } = require("./lib/auto-analysis");
            const result = await runAutoAnalysis();
            console.log("[auto-analysis] Direct run result:", result);
          } else {
            const result = await res.json();
            console.log("[auto-analysis] API result:", result);
          }
        } catch (e) {
          console.error("[auto-analysis] Error:", e.message || e);
        }
      });

      console.log(`[auto-analysis] Cron scheduled: ${cronExpr} (KST ${String(settings.cronHour).padStart(2,"0")}:${String(settings.cronMinute).padStart(2,"0")})`);
    } catch (e) {
      console.error("[auto-analysis] Setup error:", e.message || e);
    }
  }

  // 시작 시 + 30분마다 설정 갱신
  setupAutoAnalysisCron();
  setInterval(setupAutoAnalysisCron, 30 * 60 * 1000);

  // ═══════════════════════════════════════
  //  생일 보상 cron (매일 KST 0:05)
  // ═══════════════════════════════════════
  // KST 0:05 = UTC 15:05 (전날)
  cron.schedule("5 15 * * *", async () => {
    try {
      const secret = process.env.INTERNAL_CRON_SECRET || "";
      const res = await fetch("http://localhost:3000/api/internal/birthday-grant", {
        method: "POST",
        headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      });
      const j = await res.json();
      console.log(`[birthday-grant] ${JSON.stringify(j)}`);
    } catch (e) {
      console.error("[birthday-grant] error:", e?.message || e);
    }
  });

  // ═══════════════════════════════════════
  //  YouTube 하이라이트 누적 sync (30분마다)
  // ═══════════════════════════════════════
  async function runHighlightSync() {
    try {
      const secret = process.env.INTERNAL_CRON_SECRET || "";
      const res = await fetch("http://localhost:3000/api/internal/highlights-sync", {
        method: "POST",
        headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      });
      const j = await res.json();
      if (j.ok) console.log(`[highlight-sync] inserted=${j.inserted} updated=${j.updated} total=${j.total}`);
      else console.error("[highlight-sync] failed:", j.error);
    } catch (e) {
      console.error("[highlight-sync] error:", e?.message || e);
    }
  }
  // 시작 후 60초 뒤 1회 + 이후 30분마다
  setTimeout(runHighlightSync, 60 * 1000);
  setInterval(runHighlightSync, 30 * 60 * 1000);

  httpServer.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });
});
