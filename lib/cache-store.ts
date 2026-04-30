/**
 * 공유 캐시 스토어
 * API route에서 캐시를 저장하고, 관리자 API에서 초기화할 수 있음
 */

interface CacheEntry {
  data: unknown;
  ts: number;
}

const store: Record<string, CacheEntry | null> = {};

export function getCache(key: string, ttl: number): unknown | null {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) {
    store[key] = null;
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: unknown): void {
  store[key] = { data, ts: Date.now() };
}

export function clearCache(key: string): void {
  store[key] = null;
}
