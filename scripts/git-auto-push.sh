#!/bin/bash
#
# LiveTV 소스 자동 백업 (GitHub push)
# - 매일 새벽 cron 실행
# - 변경사항이 있으면 자동 commit + push
# - 변경 없으면 조용히 종료
#

set -e

cd /root/livetv

TS=$(date +"%Y-%m-%d %H:%M KST")

# 스테이징
git add -A

# 변경사항 없으면 조용히 종료 (exit 0)
if git diff --cached --quiet; then
  echo "[git-auto-push] ${TS} - 변경 없음, 종료"
  exit 0
fi

# 변경 파일 수 + 통계
CHANGED=$(git diff --cached --name-only | wc -l)
STATS=$(git diff --cached --shortstat)

# commit
git -c user.name="server-bot" -c user.email="bot@livetv-01.com" \
    commit -m "auto-backup: ${TS} (${CHANGED} files)" -m "${STATS}"

# push (실패해도 commit은 보존됨)
if git push origin main 2>&1; then
  echo "[git-auto-push] ${TS} - push 성공 (${CHANGED} files)"
else
  echo "[git-auto-push] ${TS} - ⚠️ push 실패. 다음 실행에서 재시도됨"
  exit 1
fi
