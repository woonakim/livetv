import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;

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
