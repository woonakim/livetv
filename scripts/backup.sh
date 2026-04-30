#!/bin/bash
#
# LiveTV 일일 자동 백업
# - DB 덤프 (PostgreSQL)
# - 업로드 파일
# - 설정 파일
# - 7일 이상 된 백업 자동 삭제
#

BACKUP_DIR="/var/backups/livetv"
DATE=$(date +%Y%m%d_%H%M)
TODAY_DIR="${BACKUP_DIR}/${DATE}"

mkdir -p "$TODAY_DIR"

echo "[backup] ${DATE} 백업 시작"

# 1. PostgreSQL DB 덤프
echo "[backup] DB 덤프..."
docker exec postgres pg_dump -U livetv livetv | gzip > "${TODAY_DIR}/db.sql.gz" 2>/dev/null
if [ $? -eq 0 ] && [ -s "${TODAY_DIR}/db.sql.gz" ]; then
  echo "[backup] DB 덤프 완료: $(du -sh ${TODAY_DIR}/db.sql.gz | awk '{print $1}')"
else
  echo "[backup] DB 덤프 실패, pg_dump 직접 시도..."
  PGPASSWORD=livetv1234 pg_dump -h localhost -U livetv livetv 2>/dev/null | gzip > "${TODAY_DIR}/db.sql.gz"
  if [ -s "${TODAY_DIR}/db.sql.gz" ]; then
    echo "[backup] DB 덤프 완료 (직접): $(du -sh ${TODAY_DIR}/db.sql.gz | awk '{print $1}')"
  else
    echo "[backup] ⚠️ DB 덤프 실패"
  fi
fi

# 2. 업로드 파일
echo "[backup] 업로드 파일..."
if [ -d "/root/livetv/public/uploads" ]; then
  tar czf "${TODAY_DIR}/uploads.tar.gz" -C /root/livetv/public uploads 2>/dev/null
  echo "[backup] 업로드 백업 완료: $(du -sh ${TODAY_DIR}/uploads.tar.gz | awk '{print $1}')"
else
  echo "[backup] 업로드 폴더 없음 (스킵)"
fi

# 3. 설정 파일
echo "[backup] 설정 파일..."
tar czf "${TODAY_DIR}/config.tar.gz" \
  /root/livetv/.env \
  /root/livetv/prisma/schema.prisma \
  /root/livetv/server.js \
  /root/livetv/next.config.mjs \
  /root/livetv/package.json \
  /etc/nginx/sites-available/livefelix.com \
  2>/dev/null
echo "[backup] 설정 백업 완료: $(du -sh ${TODAY_DIR}/config.tar.gz | awk '{print $1}')"

# 4. 팀 로고, 배너 이미지
echo "[backup] 정적 파일..."
tar czf "${TODAY_DIR}/static.tar.gz" \
  -C /root/livetv/public \
  team-logos live_logo real_logo \
  tel_link_banner.png popup.png \
  2>/dev/null
echo "[backup] 정적 파일 완료: $(du -sh ${TODAY_DIR}/static.tar.gz 2>/dev/null | awk '{print $1}')"

# 5. 소스 코드 tarball (node_modules/.next/.git 제외)
echo "[backup] 소스 코드..."
tar czf "${TODAY_DIR}/source.tar.gz" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=public/uploads \
  --exclude=public/team-logos \
  -C /root livetv 2>/dev/null
if [ -s "${TODAY_DIR}/source.tar.gz" ]; then
  echo "[backup] 소스 백업 완료: $(du -sh ${TODAY_DIR}/source.tar.gz | awk '{print $1}')"
else
  echo "[backup] ⚠️ 소스 백업 실패"
fi

# 6. 7일 이상 된 백업 삭제
echo "[backup] 오래된 백업 정리..."
find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +7 -exec rm -rf {} \;

# 완료
TOTAL=$(du -sh "$TODAY_DIR" | awk '{print $1}')
echo "[backup] ✅ 백업 완료: ${TODAY_DIR} (${TOTAL})"

# 백업 목록
echo "[backup] 보관 중인 백업:"
ls -1d ${BACKUP_DIR}/2* 2>/dev/null | while read d; do
  echo "  $(basename $d) - $(du -sh $d | awk '{print $1}')"
done
