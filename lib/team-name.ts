// 중계 피드의 채널/화질/더블헤더 suffix 제거
// 예: "애틀랜타 Ch.2[HD]" → "애틀랜타", "휴스턴 [DH.1]" → "휴스턴", "포항 스틸러스 Ch.2 [HD]" → "포항 스틸러스"
export function stripChannelSuffix(name: string): string {
  return name
    // 먼저 trailing [XYZ] 제거 — Ch.N 뒤 공백 + [HD] 케이스 대응
    .replace(/\s*\[[A-Z0-9.]+\]\s*$/i, "")
    // 다음 Ch.N 제거 (공백 없는 [XYZ] 합쳐진 케이스도 처리)
    .replace(/\s*Ch\.\d+(\[[A-Z0-9.]+\])?\s*$/i, "")
    // 한 번 더 trailing [XYZ] 정리 (위 단계에서 새로 노출된 경우)
    .replace(/\s*\[[A-Z0-9.]+\]\s*$/i, "")
    .trim();
}

// logoMap에서 팀 로고 조회 (공백/채널 suffix 차이를 허용)
export function lookupTeamLogo(
  logoMap: Record<string, string>,
  name: string,
  sport?: string
): string | undefined {
  const candidates = new Set<string>([name]);
  candidates.add(name.replace(/\s/g, ""));
  const stripped = stripChannelSuffix(name);
  if (stripped && stripped !== name) {
    candidates.add(stripped);
    candidates.add(stripped.replace(/\s/g, ""));
  }
  let found: string | undefined;
  candidates.forEach((c) => {
    if (found) return;
    if (sport) {
      const k = logoMap[`${sport}:${c}`];
      if (k) { found = k; return; }
    }
    const k = logoMap[c];
    if (k) found = k;
  });
  return found;
}
