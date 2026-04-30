/**
 * 메모리 기반 Rate Limiter (Next.js App Router용)
 * IP별 요청 횟수를 추적, 제한 초과 시 429 반환
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores: Record<string, Map<string, RateLimitEntry>> = {};

// 5분마다 만료된 엔트리 정리
setInterval(() => {
  const now = Date.now();
  Object.values(stores).forEach(store => {
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key);
    });
  });
}, 300000);

export function rateLimit(options: {
  name: string;         // 리미터 이름 (엔드포인트별 분리)
  maxRequests: number;   // 윈도우 내 최대 요청 수
  windowMs: number;      // 윈도우 크기 (밀리초)
}) {
  if (!stores[options.name]) {
    stores[options.name] = new Map();
  }
  const store = stores[options.name];

  return {
    check(ip: string): { ok: boolean; remaining: number } {
      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now > entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + options.windowMs });
        return { ok: true, remaining: options.maxRequests - 1 };
      }

      entry.count++;
      if (entry.count > options.maxRequests) {
        return { ok: false, remaining: 0 };
      }

      return { ok: true, remaining: options.maxRequests - entry.count };
    },
  };
}

// ── 사전 정의된 리미터들 ──

export const loginLimiter = rateLimit({
  name: "login",
  maxRequests: 10,
  windowMs: 60 * 1000, // 10회/분
});

export const registerLimiter = rateLimit({
  name: "register",
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 5회/시간
});

export const chatLimiter = rateLimit({
  name: "chat",
  maxRequests: 100,
  windowMs: 60 * 1000, // 100회/분
});

export const apiLimiter = rateLimit({
  name: "api",
  maxRequests: 100,
  windowMs: 60 * 1000, // 100회/분
});
