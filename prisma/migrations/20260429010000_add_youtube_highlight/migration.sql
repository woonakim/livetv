-- YouTube 하이라이트 누적 저장
CREATE TABLE "YouTubeHighlight" (
  "videoId"     TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "channel"     TEXT NOT NULL,
  "channelId"   TEXT NOT NULL,
  "thumbnail"   TEXT NOT NULL DEFAULT '',
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "category"    TEXT NOT NULL DEFAULT 'etc',
  "league"      TEXT NOT NULL DEFAULT '',
  "homeTeam"    TEXT NOT NULL DEFAULT '',
  "awayTeam"    TEXT NOT NULL DEFAULT '',
  "isHighlight" BOOLEAN NOT NULL DEFAULT false,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "YouTubeHighlight_category_publishedAt_idx" ON "YouTubeHighlight"("category", "publishedAt" DESC);
CREATE INDEX "YouTubeHighlight_publishedAt_idx" ON "YouTubeHighlight"("publishedAt" DESC);
