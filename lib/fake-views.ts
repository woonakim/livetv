// 분석글 가짜 조회수 부풀리기 — sqrt 곡선 ramp + 단조 증가
// 우선순위: 개별 설정 (fakeViewsManualSet=true) > 전역 설정 (SiteSetting)

interface PostFields {
  id: number;
  viewCount: number;
  fakeViewsEnabled: boolean;
  fakeViewsTarget: number;
  fakeViewsRampHours: number;
  fakeViewsStartAt: Date | null;
  fakeViewsManualSet: boolean;
  createdAt: Date;
}

export interface GlobalFakeViewsConfig {
  fakeViewsAnalysisEnabled: boolean;
  fakeViewsAnalysisTargetMin: number;
  fakeViewsAnalysisTargetMax: number;
  fakeViewsAnalysisRampHours: number;
}

function rampBoost(target: number, rampHours: number, startMs: number): number {
  if (target <= 0) return 0;
  const elapsedHours = Math.max(0, (Date.now() - startMs) / (1000 * 60 * 60));
  const ramp = Math.max(1, rampHours);
  if (elapsedHours >= ramp) return target;
  const progress = elapsedHours / ramp;
  // sqrt 곡선 — 초반 빠르고 후반 느림 (실제 게시글 조회 패턴)
  return Math.round(target * Math.sqrt(progress));
}

export function computeDisplayedViewCount(post: PostFields, global?: GlobalFakeViewsConfig): number {
  const real = post.viewCount || 0;

  // 1) 개별 설정이 있으면 우선 — 단, fakeViewsEnabled=false일 수도 있음 (이 글은 부풀리지 말라는 명시)
  if (post.fakeViewsManualSet) {
    if (!post.fakeViewsEnabled || post.fakeViewsTarget <= 0) return real;
    const startMs = post.fakeViewsStartAt
      ? new Date(post.fakeViewsStartAt).getTime()
      : new Date(post.createdAt).getTime();
    return real + rampBoost(post.fakeViewsTarget, post.fakeViewsRampHours, startMs);
  }

  // 2) 개별 설정 없으면 전역 default 적용
  if (global?.fakeViewsAnalysisEnabled && global.fakeViewsAnalysisTargetMax > 0) {
    const min = Math.max(0, global.fakeViewsAnalysisTargetMin || 0);
    const max = Math.max(min, global.fakeViewsAnalysisTargetMax);
    // 글 ID로 deterministic target — Knuth 곱셈 해시로 ID가 작아도 범위 전체에 균등 분포
    const range = max - min + 1;
    const hash = (Math.abs(post.id) * 2654435761) >>> 0;
    const target = min + (hash % range);
    const startMs = new Date(post.createdAt).getTime();
    return real + rampBoost(target, global.fakeViewsAnalysisRampHours || 24, startMs);
  }

  return real;
}
