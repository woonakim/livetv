// Service Worker for 라이브TV PWA
const CACHE_NAME = "livetv-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Push notification
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || "라이브TV", {
      body: data.body || "새로운 알림이 있습니다.",
      icon: "/real_logo/livetv_logo.png",
      badge: "/real_logo/livetv_logo.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(clients.openWindow(url));
});
