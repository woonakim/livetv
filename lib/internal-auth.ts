// 내부 cron 엔드포인트 인증
// transition: secret 일치 OR localhost 호스트 둘 다 허용
// 추후 transition 종료 시 host 검사 제거 예정
export function isInternalAuthorized(req: Request): boolean {
  const secret = process.env.INTERNAL_CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (secret && auth === expected) return true;

  // transition fallback: localhost 호출 허용
  const host = req.headers.get("host") || "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return true;
  return false;
}

export function internalCronHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_CRON_SECRET || "";
  return secret ? { Authorization: `Bearer ${secret}` } : {};
}
