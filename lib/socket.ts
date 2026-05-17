import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;

// 로그인/로그아웃 시 호출 — disconnect+connect으로 새 cookie로 재핸드셰이크
// (socket 인스턴스는 유지 → 모든 리스너 그대로 살아있음)
export function resetSocket() {
  if (!socket) return;
  try {
    socket.disconnect();
    socket.connect();
  } catch {}
}

// 비회원 식별자 — localStorage 기반, 브라우저 단위로 유지. 6자리 랜덤 손님번호.
function ensureGuest(): { guestId: string; guestName: string } | Record<string, never> {
  if (typeof window === "undefined") return {};
  try {
    let id = localStorage.getItem("livetv_guest_id");
    let name = localStorage.getItem("livetv_guest_name");
    if (!id) {
      id = `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      localStorage.setItem("livetv_guest_id", id);
    }
    if (!name) {
      name = `손님${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem("livetv_guest_name", name);
    }
    return { guestId: id, guestName: name };
  } catch { return {}; }
}

export function getSocket(): Socket {
  if (!socket || socket.disconnected) {
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: ensureGuest(),
    });

    socket.on("reconnect", () => {
      console.log("[socket] reconnected");
    });

    // Cloudflare/nginx idle timeout 방지: 30초마다 ping
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit("ping");
      }
    }, 30000);
  }
  return socket;
}
