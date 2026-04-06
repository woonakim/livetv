#!/bin/bash
#
# 실시간 썸네일 캡처 워커
# - 새 라이브 경기: 즉시 캡처
# - 이후: TTL 지난 경기만 증분 갱신
# - 동시 ffmpeg: 항상 1개만
#

THUMB_DIR="/var/www/thumbnails"
API_URL="http://localhost:3000/api/sports-live"
REFERER="https://livefelix.com/"
REFRESH_INTERVAL=20   # 20초마다 갱신 대상 확인
THUMB_TTL=60         # 60초 지난 썸네일만 재캡처
MAX_UPDATES_PER_CYCLE=3  # 한 사이클당 최대 3개만 갱신
STALE_DELETE_TTL=21600   # 비활성 썸네일은 6시간 후 정리
STATE_FILE="/tmp/livetv-thumbnail.offset"

mkdir -p "$THUMB_DIR"

echo "[thumb] Started. Poll=${REFRESH_INTERVAL}s TTL=${THUMB_TTL}s Max=${MAX_UPDATES_PER_CYCLE}"

# 단일 캡처 (타임아웃 5초)
capture_one() {
  local url="$1"
  local key="$2"
  local temp="${THUMB_DIR}/${key}_tmp.jpg"
  local dest="${THUMB_DIR}/${key}.jpg"

  timeout 5 ffmpeg -y \
    -headers "Referer: ${REFERER}\r\n" \
    -i "$url" \
    -frames:v 1 \
    -vf "scale=320:180" \
    -q:v 5 \
    "$temp" \
    </dev/null 2>/dev/null

  if [ -f "$temp" ] && [ -s "$temp" ]; then
    mv "$temp" "$dest"
    return 0
  fi
  rm -f "$temp"
  return 1
}

needs_refresh() {
  local key="$1"
  local dest="${THUMB_DIR}/${key}.jpg"

  [ ! -f "$dest" ] && return 0

  local now mtime age
  now=$(date +%s)
  mtime=$(stat -c %Y "$dest" 2>/dev/null || echo 0)
  age=$((now - mtime))

  [ "$age" -ge "$THUMB_TTL" ]
}

should_delete_stale() {
  local key="$1"
  local dest="${THUMB_DIR}/${key}.jpg"

  [ ! -f "$dest" ] && return 1

  local now mtime age
  now=$(date +%s)
  mtime=$(stat -c %Y "$dest" 2>/dev/null || echo 0)
  age=$((now - mtime))

  [ "$age" -ge "$STALE_DELETE_TTL" ]
}

get_offset() {
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

set_offset() {
  printf '%s\n' "$1" > "$STATE_FILE"
}

# 라이브 목록 가져오기
get_streams() {
  curl -s "$API_URL" 2>/dev/null | python3 -c "
import json, sys, re
try:
    data = json.load(sys.stdin)
    for m in data.get('live', []):
        url = m.get('streamUrl', '')
        sid = m.get('id', '')
        if url and sid:
            key = re.sub(r'[^a-zA-Z0-9_-]', '_', sid)
            print(f'{key}|{url}')
except:
    pass
" 2>/dev/null
}

while true; do
  STREAMS=$(get_streams)

  if [ -z "$STREAMS" ]; then
    sleep 30
    continue
  fi

  mapfile -t STREAM_LINES <<< "$STREAMS"
  STREAM_COUNT=${#STREAM_LINES[@]}
  OFFSET=$(get_offset)
  if [ "$STREAM_COUNT" -gt 0 ]; then
    OFFSET=$((OFFSET % STREAM_COUNT))
  else
    OFFSET=0
  fi

  # 현재 활성 키 목록
  ACTIVE_KEYS=""

  REFRESHED_COUNT=0
  NEXT_OFFSET="$OFFSET"
  for ((step = 0; step < STREAM_COUNT; step++)); do
    idx=$(((OFFSET + step) % STREAM_COUNT))
    IFS='|' read -r key url <<< "${STREAM_LINES[$idx]}"
    [ -z "$key" ] && continue
    ACTIVE_KEYS="$ACTIVE_KEYS $key"

    if needs_refresh "$key"; then
      if [ "$REFRESHED_COUNT" -ge "$MAX_UPDATES_PER_CYCLE" ]; then
        NEXT_OFFSET="$idx"
        break
      fi
      if [ -f "${THUMB_DIR}/${key}.jpg" ]; then
        echo "[thumb] REFRESH: $key"
      else
        echo "[thumb] NEW: $key"
      fi
      capture_one "$url" "$key"
      REFRESHED_COUNT=$((REFRESHED_COUNT + 1))
      NEXT_OFFSET=$(((idx + 1) % STREAM_COUNT))
    fi
  done

  if [ "$STREAM_COUNT" -gt 0 ]; then
    set_offset "$NEXT_OFFSET"
  fi

  [ $REFRESHED_COUNT -gt 0 ] && echo "[thumb] $REFRESHED_COUNT thumbnails updated"

  # 종료된 스트림 썸네일 정리
  for f in "$THUMB_DIR"/*.jpg; do
    [ -e "$f" ] || continue
    fname=$(basename "$f" .jpg)
    [ "$fname" = "default" ] && continue
    [ "${fname%_tmp}" != "$fname" ] && continue
    if ! echo "$ACTIVE_KEYS" | grep -q "$fname"; then
      if should_delete_stale "$fname"; then
        rm -f "$f"
      fi
    fi
  done

  echo "[thumb] Waiting ${REFRESH_INTERVAL}s for next poll..."
  sleep "$REFRESH_INTERVAL"
done
