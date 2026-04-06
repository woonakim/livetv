#!/bin/bash
#
# SRS 릴레이: 업체 HLS → ffmpeg → SRS(RTMP) → 2초 HLS
# - 라이브 경기 목록에서 스트림 URL을 가져와서 SRS에 릴레이
# - 동시 최대 6개 스트림 (CPU 보호)
# - 30초마다 목록 갱신
#

API_URL="http://localhost:3000/api/sports-live"
SRS_RTMP="rtmp://127.0.0.1:1935/live"
REFERER="https://livefelix.com/"
MAX_STREAMS=6

declare -A PIDS

cleanup() {
  echo "[relay] Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
  exit 0
}
trap cleanup SIGINT SIGTERM

relay_one() {
  local url="$1"
  local key="$2"

  while true; do
    ffmpeg -y -rw_timeout 10000000 \
      -headers "Referer: ${REFERER}\r\n" \
      -i "$url" \
      -map 0:v:0 -map 0:a:0 \
      -c copy \
      -f flv \
      "${SRS_RTMP}/${key}" \
      </dev/null 2>/dev/null

    # 스트림 끊기면 3초 후 재시도
    sleep 3
  done
}

echo "[relay] Started. Max ${MAX_STREAMS} streams."

while true; do
  STREAMS=$(curl -s "$API_URL" 2>/dev/null | python3 -c "
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
" 2>/dev/null)

  declare -A ACTIVE_KEYS
  COUNT=0

  while IFS='|' read -r key url; do
    [ -z "$key" ] && continue
    [ $COUNT -ge $MAX_STREAMS ] && break
    ACTIVE_KEYS["$key"]=1

    # 이미 실행 중이면 스킵
    if [ -n "${PIDS[$key]}" ] && kill -0 "${PIDS[$key]}" 2>/dev/null; then
      COUNT=$((COUNT + 1))
      continue
    fi

    echo "[relay] Starting: $key"
    relay_one "$url" "$key" &
    PIDS["$key"]=$!
    COUNT=$((COUNT + 1))
  done <<< "$STREAMS"

  # 종료된 스트림 정리
  for key in "${!PIDS[@]}"; do
    if [ -z "${ACTIVE_KEYS[$key]}" ]; then
      echo "[relay] Stopping: $key"
      kill "${PIDS[$key]}" 2>/dev/null
      unset PIDS["$key"]
    fi
  done
  unset ACTIVE_KEYS

  sleep 30
done
