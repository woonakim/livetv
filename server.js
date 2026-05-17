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

// 채팅 보상 — lib/reward.ts:grantChatReward 와 동기 유지 (TS→JS 직접 import 불가로 인라인)
function _todayKstDateOnly() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}
async function grantChatReward(userId, text) {
  if (!userId) return null;
  try {
    const trimmed = String(text || "").trim();
    const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    if (!setting) return null;
    if (setting.chatMinLengthEnabled && trimmed.length < setting.chatMinLength) return null;
    const reward = await prisma.activityReward.findUnique({ where: { activityKey: "chat" } });
    if (!reward || !reward.isActive || (reward.points === 0 && reward.exp === 0)) return null;

    const today = _todayKstDateOnly();
    const todayKey = today.toISOString().slice(0, 10);
    // 새 날 시작이면 누적치 리셋
    await prisma.user.updateMany({
      where: { id: userId, OR: [{ chatRewardDate: null }, { chatRewardDate: { lt: today } }] },
      data: { chatRewardPoints: 0, chatRewardExp: 0, chatRewardDate: today },
    });
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { chatRewardPoints: true, chatRewardExp: true, chatRewardDate: true },
    });
    if (!u) return null;
    const sameDay = u.chatRewardDate?.toISOString().slice(0, 10) === todayKey;
    const accumPts = sameDay ? u.chatRewardPoints : 0;
    const accumExp = sameDay ? u.chatRewardExp : 0;
    const ptsCap = setting.chatRewardDailyPointCap;
    const expCap = setting.chatRewardDailyExpCap;
    const remainPts = ptsCap === 0 ? reward.points : Math.max(0, ptsCap - accumPts);
    const remainExp = expCap === 0 ? reward.exp : Math.max(0, expCap - accumExp);
    const grantPts = Math.min(reward.points, remainPts);
    const grantExp = Math.min(reward.exp, remainExp);
    if (grantPts === 0 && grantExp === 0) return null;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: grantPts },
        exp: { increment: grantExp },
        chatRewardPoints: { increment: grantPts },
        chatRewardExp: { increment: grantExp },
      },
      select: { points: true },
    });
    await prisma.pointLog.create({
      data: { userId, type: "EARN", amount: grantPts, reason: "채팅 보상", balance: updated.points },
    });
    return { points: grantPts, exp: grantExp };
  } catch (e) {
    console.error("[reward] grantChatReward (server.js) failed:", e.message);
    return null;
  }
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

  // ─── 관리자용: 현재 접속자 목록 추적 ───
  //  비회원: 클라이언트 localStorage 의 손님XXXXXX (6자리 랜덤) — handshake.auth 로 전달
  //  멀티탭 dedupe: 회원은 userId, 비회원은 guestId 기준 (한 명당 하나만 카운트)
  const onlineSockets = new Map(); // socketId -> { userId|null, guestId|null, nickname, isGuest, joinedAt }

  // 특정 BJ 방송을 시청 중인 인원만 (bj:${bjId} room 에 가입된 socket 기준)
  function getOnlineListByBj(bjId) {
    if (!bjId) return { bjId, members: [], guests: [], count: 0 };
    const room = io.sockets.adapter.rooms.get(`bj:${bjId}`);
    if (!room) return { bjId, members: [], guests: [], count: 0 };
    const memberMap = new Map();
    const guestMap = new Map();
    for (const sid of room) {
      const e = onlineSockets.get(sid);
      if (!e) continue;
      if (e.isGuest) {
        if (!e.guestId) continue;
        const prev = guestMap.get(e.guestId);
        if (!prev || e.joinedAt < prev.joinedAt) {
          guestMap.set(e.guestId, { nickname: e.nickname, isGuest: true, joinedAt: e.joinedAt });
        }
      } else {
        const prev = memberMap.get(e.userId);
        if (!prev || e.joinedAt < prev.joinedAt) {
          memberMap.set(e.userId, { nickname: e.nickname, isGuest: false, joinedAt: e.joinedAt });
        }
      }
    }
    const members = Array.from(memberMap.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    const guests = Array.from(guestMap.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    return { bjId, members, guests, count: members.length + guests.length };
  }

  // BJ 별로 한 번씩 debounce 해서 admin room 에 변경 push (모든 admin 이 받지만 mainBjId 일치 시에만 반영)
  const bjBroadcastTimers = new Map();
  function broadcastOnlineListForBj(bjId) {
    if (!bjId) return;
    if (bjBroadcastTimers.has(bjId)) return;
    const t = setTimeout(() => {
      bjBroadcastTimers.delete(bjId);
      io.to("admin").emit("admin:online-users", getOnlineListByBj(bjId));
    }, 300);
    bjBroadcastTimers.set(bjId, t);
  }

  // ═══════════════════════════════════════════════════════════
  //  가짜 시청자 부풀리기 (공개채팅 + BJ 라이브)
  //  - 60초마다 SiteSetting/BjProfile 설정 reload
  //  - 4초마다 (3~5초 jitter) 모든 라이브 BJ + 공개채팅 갱신
  //  - random walk으로 자연스러운 변동
  //  - BJ 방송 0~rampSec 구간: 0 → max로 ramp-up
  // ═══════════════════════════════════════════════════════════
  let fakeChatCfg = { enabled: false, min: 0, max: 0 };
  const fakeBjCfg = new Map();   // bjId -> { enabled, min, max, rampSec, liveStartedAt }
  let chatBoost = 0;             // 현재 공개채팅 boost
  const bjBoost = new Map();     // bjId -> 현재 boost

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function randInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }

  // 캐시에 없는 BJ에 대해 즉시 cfg 로드 (방송 시작 직후 viewer 입장 케이스)
  async function ensureBjCfg(bjId) {
    if (fakeBjCfg.has(bjId)) return fakeBjCfg.get(bjId);
    try {
      const b = await prisma.bjProfile.findUnique({
        where: { id: bjId },
        select: { isLive: true, fakeViewersEnabled: true, fakeViewersMin: true, fakeViewersMax: true, fakeViewersRampSec: true, liveStartedAt: true, liveViewers: true },
      });
      if (!b || !b.isLive) return null;
      const cfg = {
        enabled: !!b.fakeViewersEnabled,
        min: Math.max(0, b.fakeViewersMin || 0),
        max: Math.max(0, b.fakeViewersMax || 0),
        rampSec: Math.max(1, b.fakeViewersRampSec || 600),
        liveStartedAt: b.liveStartedAt ? new Date(b.liveStartedAt).getTime() : Date.now(),
        realViewers: b.liveViewers || 0,
      };
      fakeBjCfg.set(bjId, cfg);
      return cfg;
    } catch { return null; }
  }

  // 캐시된 boost가 있으면 그대로, 없으면 ramp/walk 로직으로 즉석 계산
  function getOrComputeBjBoost(bjId, cfg) {
    if (!cfg || !cfg.enabled || cfg.max <= 0) return 0;
    const cached = bjBoost.get(bjId);
    if (cached !== undefined) return cached;
    const elapsedSec = Math.max(0, (Date.now() - cfg.liveStartedAt) / 1000);
    let next;
    if (elapsedSec < cfg.rampSec) {
      const progress = elapsedSec / cfg.rampSec;
      const target = Math.round(cfg.min + (cfg.max - cfg.min) * progress);
      next = clamp(target + randInt(-2, 2), 0, cfg.max);
    } else {
      next = randInt(cfg.min, cfg.max);
    }
    bjBoost.set(bjId, next);
    return next;
  }

  // 채팅 boost 즉석 계산 (필요 시)
  function getOrComputeChatBoost() {
    if (!fakeChatCfg.enabled || fakeChatCfg.max <= 0) return 0;
    if (chatBoost > 0) return chatBoost;
    chatBoost = randInt(fakeChatCfg.min, fakeChatCfg.max);
    return chatBoost;
  }

  // REST API에서 사용할 글로벌 헬퍼
  global.__getBjDisplayedViewers = async (bjId, realCount) => {
    const cfg = await ensureBjCfg(bjId);
    if (!cfg) return realCount;
    return realCount + getOrComputeBjBoost(bjId, cfg);
  };

  async function reloadFakeViewerCfg() {
    try {
      const s = await prisma.siteSetting.findFirst();
      if (s) {
        fakeChatCfg = {
          enabled: !!s.fakeViewersChatEnabled,
          min: Math.max(0, s.fakeViewersChatMin || 0),
          max: Math.max(0, s.fakeViewersChatMax || 0),
        };
      }
      const bjs = await prisma.bjProfile.findMany({
        where: { isLive: true },
        select: { id: true, fakeViewersEnabled: true, fakeViewersMin: true, fakeViewersMax: true, fakeViewersRampSec: true, liveStartedAt: true, liveViewers: true },
      });
      const liveIds = new Set(bjs.map(b => b.id));
      for (const b of bjs) {
        fakeBjCfg.set(b.id, {
          enabled: !!b.fakeViewersEnabled,
          min: Math.max(0, b.fakeViewersMin || 0),
          max: Math.max(0, b.fakeViewersMax || 0),
          rampSec: Math.max(1, b.fakeViewersRampSec || 600),
          liveStartedAt: b.liveStartedAt ? new Date(b.liveStartedAt).getTime() : Date.now(),
          realViewers: b.liveViewers || 0,
        });
      }
      // 라이브 종료된 BJ는 boost 정리
      for (const k of fakeBjCfg.keys()) if (!liveIds.has(k)) { fakeBjCfg.delete(k); bjBoost.delete(k); }
    } catch (e) { console.error("[fake-viewers] reload failed:", e.message); }
  }
  reloadFakeViewerCfg();
  setInterval(reloadFakeViewerCfg, 60_000);

  function tickChatBoost() {
    if (!fakeChatCfg.enabled || fakeChatCfg.max <= 0) {
      chatBoost = 0;
      io.emit("viewer:chat", { count: onlineCount, real: onlineCount });
      return;
    }
    const { min, max } = fakeChatCfg;
    if (chatBoost < min || chatBoost > max) chatBoost = randInt(min, max);
    else chatBoost = clamp(chatBoost + randInt(-3, 3), min, max);
    io.emit("viewer:chat", { count: onlineCount + chatBoost, real: onlineCount });
  }

  function tickBjBoost() {
    const now = Date.now();
    for (const [bjId, cfg] of fakeBjCfg) {
      const real = cfg.realViewers || 0;
      if (!cfg.enabled || cfg.max <= 0) {
        bjBoost.set(bjId, 0);
        io.to(`bj:${bjId}`).emit("viewer:bj", { bjId, count: real, real });
        continue;
      }
      const { min, max, rampSec, liveStartedAt } = cfg;
      const elapsedSec = Math.max(0, (now - liveStartedAt) / 1000);
      let prev = bjBoost.get(bjId) ?? 0;
      let next;
      if (elapsedSec < rampSec) {
        // ramp: 0 → max로 progressive
        const progress = elapsedSec / rampSec;
        const target = Math.round(min + (max - min) * progress);
        next = clamp(target + randInt(-2, 2), 0, max);
      } else {
        if (prev < min || prev > max) next = randInt(min, max);
        else next = clamp(prev + randInt(-3, 3), min, max);
      }
      bjBoost.set(bjId, next);
      io.to(`bj:${bjId}`).emit("viewer:bj", { bjId, count: real + next, real });
    }
  }

  function fakeViewerTick() {
    tickChatBoost();
    tickBjBoost();
    // 다음 tick: 3~5초 jitter
    setTimeout(fakeViewerTick, randInt(3000, 5000));
  }
  setTimeout(fakeViewerTick, 3000);


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
    // 공개채팅 가짜 시청자 현재값 즉시 전송 (boost 미계산 상태면 즉석 계산)
    socket.emit("viewer:chat", { count: onlineCount + getOrComputeChatBoost(), real: onlineCount });

    // 접속자 목록 등록
    // 비회원: 클라이언트 handshake.auth.guestId/guestName 사용 (localStorage 의 6자리 손님번호)
    const _auth = getUserFromSocket(socket);
    const _hsAuth = socket.handshake?.auth || {};
    const _entry = _auth
      ? { userId: _auth.id, guestId: null, nickname: _auth.nickname || `회원${_auth.id}`, isGuest: false, joinedAt: Date.now() }
      : {
          userId: null,
          guestId: typeof _hsAuth.guestId === "string" ? _hsAuth.guestId : null,
          nickname: (typeof _hsAuth.guestName === "string" && _hsAuth.guestName) ? _hsAuth.guestName : "손님(미식별)",
          isGuest: true,
          joinedAt: Date.now(),
        };
    onlineSockets.set(socket.id, _entry);
    // 사이트 전체 connection 시점 broadcast 는 폐기 — bj:join/bj:leave/disconnect 에서 BJ 별로 broadcast

    // 관리자 room 참가 — 즉시 응답은 mainBjId 모르므로 빈 목록 (클라이언트가 watch bj 시 refresh 호출)
    socket.on("admin:join", () => {
      const auth = getUserFromSocket(socket);
      if (!auth) return;
      prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } }).then(user => {
        if (user && ["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(user.role)) {
          socket.join("admin");
        }
      });
    });

    // 관리자 — 특정 BJ 방송 시청자 목록 강제 새로고침
    socket.on("admin:online-users:refresh", ({ bjId } = {}) => {
      if (!socket.rooms.has("admin")) return;
      if (!bjId) return;
      socket.emit("admin:online-users", getOnlineListByBj(bjId));
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
        // 채팅 보상 (fire-and-forget — 실패해도 메시지 송출은 계속)
        if (userId) grantChatReward(userId, text).catch(() => {});
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
    // socket.data.joinedBjs: Set<bjId> — disconnect 시 퇴장 알림을 위해 추적
    socket.data.joinedBjs = new Set();

    // mod 권한 확인 (BJ 본인 / 매니저 / ADMIN+) → mod-room 가입 여부 결정
    async function isMod(bjId, userId, role) {
      if (!userId) return false;
      if (["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(role || "")) return true;
      const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
      if (bjProfile?.userId === userId) return true;
      const mgr = await prisma.bjChatManager.findUnique({
        where: { bjProfileId_userId: { bjProfileId: bjId, userId } },
      });
      return !!mgr;
    }

    // 입/퇴장 알림 — mod-room 으로만 emit (메시지는 DB 저장 안 함, 휘발성)
    function emitPresence(bjId, kind, nickname) {
      const modRoom = `bj:${bjId}:mod`;
      io.to(modRoom).emit("bj:presence", {
        bjId, kind, nickname, ts: Date.now(),
      });
    }

    socket.on("bj:join", async ({ bjId, guestId, guestName }) => {
      if (!bjId) return;
      const room = `bj:${bjId}`;
      if (socket.data.joinedBjs.has(bjId)) return; // 중복 방지
      socket.join(room);
      socket.data.joinedBjs.add(bjId);

      const auth = getUserFromSocket(socket);
      // 본 socket의 식별자 (회원 닉네임 or 게스트 닉네임) 저장 — disconnect 시 사용
      let presenceName = "";
      if (auth) {
        const u = await prisma.user.findUnique({ where: { id: auth.id }, select: { nickname: true, role: true } });
        presenceName = u?.nickname || auth.nickname || "";
        // mod 권한자는 mod-room 에도 join
        if (await isMod(bjId, auth.id, u?.role || auth.role)) {
          socket.join(`bj:${bjId}:mod`);
        }
      } else if (guestName) {
        presenceName = guestName;
        socket.data.guestId = guestId || "";
        socket.data.guestName = guestName;
      }
      socket.data[`name:${bjId}`] = presenceName;

      // 최근 100개를 desc로 가져온 뒤 reverse → 화면은 오래된 → 최신 순
      // (asc + take 100 시 가장 오래된 100개만 반환되어 신규 메시지 누락되던 버그 수정)
      const [recent, pinnedMsg] = await Promise.all([
        prisma.bjChatMessage.findMany({ where: { bjProfileId: bjId }, orderBy: { createdAt: "desc" }, take: 100 }),
        prisma.bjChatMessage.findFirst({ where: { bjProfileId: bjId, isPinned: true } }),
      ]);
      const messages = recent.reverse();
      socket.emit("bj:init", { messages, pinnedMsg });
      // 가짜 시청자 현재값 즉시 전송 — 캐시 없거나 boost 미계산이면 즉석 계산
      const cfg = await ensureBjCfg(bjId);
      if (cfg) {
        const real = cfg.realViewers || 0;
        const boost = getOrComputeBjBoost(bjId, cfg);
        socket.emit("viewer:bj", { bjId, count: real + boost, real });
      }

      // 입장 알림 (mod-room 으로) + 시청자 목록 갱신 (admin 전체에 broadcast)
      if (presenceName) emitPresence(bjId, "enter", presenceName);
      broadcastOnlineListForBj(bjId);
    });

    socket.on("bj:leave", ({ bjId }) => {
      if (!bjId) return;
      if (socket.data.joinedBjs?.has(bjId)) {
        socket.data.joinedBjs.delete(bjId);
        socket.leave(`bj:${bjId}`);
        socket.leave(`bj:${bjId}:mod`);
        const name = socket.data[`name:${bjId}`];
        if (name) emitPresence(bjId, "leave", name);
        broadcastOnlineListForBj(bjId);
      }
    });

    socket.on("bj:send", async ({ bjId, text, isSystem, guestId, guestName }) => {
      if (!bjId || !text?.trim()) return;
      const auth = getUserFromSocket(socket);
      const room = `bj:${bjId}`;

      try {
        // 시스템 메시지 — 회원(BJ 본인/관리자)만 허용
        if (isSystem) {
          if (!auth) return;
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

        // 회원 메시지
        if (auth) {
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
          grantChatReward(auth.id, text).catch(() => {});
          return;
        }

        // 비회원 메시지 — guestId 차단 확인
        if (!guestId || !guestName) return;
        const gban = await prisma.bjChatBan.findUnique({
          where: { bjProfileId_guestId: { bjProfileId: bjId, guestId } },
        });
        if (gban) { socket.emit("bj:error", { error: "채팅이 차단되었습니다" }); return; }
        const msg = await prisma.bjChatMessage.create({
          data: {
            bjProfileId: bjId, userId: null,
            nickname: String(guestName).slice(0, 20),
            role: "USER", level: 0, text: text.trim(),
          },
        });
        // 비회원 메시지는 guestId 를 클라이언트로 전달 (mod 차단 버튼에서 사용)
        io.to(room).emit("bj:message", { ...msg, guestId });
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
      // disconnect 시점: socket.io 는 room 을 자동 leave 처리하므로 onlineSockets 제거 후 broadcast 시
      // 해당 BJ room 의 시청자 목록에서 자동으로 빠진다.
      const joined = Array.from(socket.data?.joinedBjs || []);
      onlineSockets.delete(socket.id);
      for (const bjId of joined) {
        const name = socket.data[`name:${bjId}`];
        if (name) {
          io.to(`bj:${bjId}:mod`).emit("bj:presence", {
            bjId, kind: "leave", nickname: name, ts: Date.now(),
          });
        }
        broadcastOnlineListForBj(bjId);
      }
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

  // ═══════════════════════════════════════
  //  이벤트매치 자동 마감 cron (1분마다)
  //  SiteSetting.autoCloseEventsEnabled=true 일 때만 실행
  //  deadline 지난 isActive=true 이벤트를 isActive=false로 변경
  // ═══════════════════════════════════════
  cron.schedule("* * * * *", async () => {
    try {
      const setting = await prisma.siteSetting.findFirst({ select: { autoCloseEventsEnabled: true } });
      if (!setting?.autoCloseEventsEnabled) return;
      const result = await prisma.event.updateMany({
        where: { isActive: true, deadline: { lt: new Date() } },
        data: { isActive: false },
      });
      if (result.count > 0) console.log(`[event-auto-close] closed ${result.count} events`);
    } catch (e) {
      console.error("[event-auto-close] error:", e?.message || e);
    }
  });

  httpServer.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });
});
