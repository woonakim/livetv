"use client";

export default function GuidePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>운영 가이드</h1>
      <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>관리자를 위한 사이트 운영 매뉴얼</p>

      <Section title="1. 일일 운영 체크리스트">
        <Table headers={["작업", "위치", "빈도"]} rows={[
          ["대시보드 확인 (접속자, 신규가입, 출석)", "/admin", "매일"],
          ["BJ 신청 확인 및 승인/거절", "/admin/bj", "수시"],
          ["픽스터 신청 확인 및 승인", "/admin/picksters", "수시"],
          ["포인트 교환 신청 처리", "/admin/exchanges", "수시"],
          ["채팅 관리 (비속어, 스팸)", "/admin/chat", "수시"],
          ["자동 분석 생성 확인 및 게시", "/admin/auto-analysis", "매일"],
          ["감사 로그 확인", "/admin/logs", "주 1회"],
        ]} />
      </Section>

      <Section title="2. 콘텐츠 관리">
        <SubSection title="2-1. 공지사항 작성">
        <UL items={[
          "관리자 > 콘텐츠 관리 > 공지사항",
          "리치 텍스트 에디터로 이미지 삽입, 글꼴 변경, 색상 적용 가능",
          "이미지: 에디터 툴바의 이미지 버튼 클릭 → 파일 선택 → 자동 업로드",
          "상단 고정: '상단 고정' 체크박스 활성화",
        ]} />
        </SubSection>

        <SubSection title="2-2. 한줄 공지">
        <UL items={[
          "관리자 > 콘텐츠 관리 > 한줄공지",
          "메인 페이지 상단 스크롤 텍스트",
          "저장 즉시 반영 (서버 캐시 무관)",
        ]} />
        </SubSection>

        <SubSection title="2-3. 이벤트 매치">
        <UL items={[
          "관리자 > 이벤트 관리 > 이벤트매치",
          "팀 A vs 팀 B 설정, 마감시간, 보상, 배너 이미지",
          "리치 텍스트 에디터로 상세 내용 작성 가능",
          "마감시간 지나면 자동으로 투표 차단",
        ]} />
        </SubSection>

        <SubSection title="2-4. 팝업 관리">
        <UL items={[
          "관리자 > 콘텐츠 관리 > 팝업 관리",
          "권장 이미지 사이즈: 1150x930px",
          "여러 팝업 동시 운영 가능, 순서 조절",
        ]} />
        </SubSection>
      </Section>

      <Section title="3. 자동 분석 시스템">
        <SubSection title="3-1. 설정">
        <UL items={[
          "관리자 > 콘텐츠 관리 > 자동 분석",
          "대상 리그 선택 (EPL, 라리가, MLB 등)",
          "상위 N위 팀 설정 (기본 4위)",
          "AI 모델 선택 (GPT 권장 — 비용 효율적)",
          "생성 시간 설정 (KST 기준, 기본 08:00)",
          "자동 게시 OFF 권장 → 임시저장 후 확인 후 게시",
        ]} />
        </SubSection>

        <SubSection title="3-2. 수동 실행">
        <UL items={[
          "'지금 생성' 버튼 클릭 → 1~2분 소요",
          "리그당 최대 3경기 생성",
          "같은 경기는 중복 생성되지 않음",
          "생성 후 체크박스로 선택 → '선택 게시' 또는 '선택 삭제'",
        ]} />
        </SubSection>

        <SubSection title="3-3. 주의사항">
        <UL items={[
          "AI API 키가 사이트 설정에 등록되어 있어야 함",
          "API 호출 비용 발생 (GPT-4o-mini 기준 경기당 약 $0.01)",
          "작성자 닉네임: '픽스터' (auto_pickster 계정)",
        ]} />
        </SubSection>
      </Section>

      <Section title="4. BJ 관리">
        <SubSection title="4-1. BJ 승인">
        <UL items={[
          "관리자 > 픽스터/BJ > BJ 관리",
          "신청 목록에서 '승인' 클릭 → 유저 role이 자동으로 BJ로 변경",
          "승인 후 BJ가 대시보드에서 스트림키 확인 가능",
        ]} />
        </SubSection>

        <SubSection title="4-2. BJ 프로필 관리">
        <UL items={[
          "승인된 BJ 테이블에서 프로필 사진 클릭 → 이모지 선택 또는 이미지 업로드",
          "스트림키 재발급: '키 재발급' 버튼 (기존 키 무효화)",
          "비활성화: BJ 방송 차단",
        ]} />
        </SubSection>

        <SubSection title="4-3. BJ 채팅 관리">
        <P>BJ가 대시보드에서 직접 관리하는 항목:</P>
        <UL items={[
          "가입문의 배너 (링크 + 텍스트)",
          "고정 메시지",
          "시스템 자동 메시지 (간격 설정)",
          "매니저 지정 (닉네임 입력)",
          "채팅 차단 목록 관리",
        ]} />
        <P>관리자/매니저가 채팅에서 할 수 있는 것:</P>
        <UL items={[
          "메시지 hover → 📌고정 / ✕삭제 / 🚫차단 / 👔매니저지정",
        ]} />
        </SubSection>
      </Section>

      <Section title="5. 회원 관리">
        <UL items={[
          "관리자 > 회원 관리 > 회원 목록",
          "역할 변경: USER / PICKSTER / BJ / ADMIN / SUPERADMIN",
          "포인트/EXP 수동 조정 가능 (사유 입력 필수)",
          "비밀번호 초기화: 기본값 '1234'로 리셋",
          "계정 비활성화: 로그인 차단",
          "모든 변경은 감사 로그에 기록됨",
        ]} />
      </Section>

      <Section title="6. SEO 관리">
        <UL items={[
          "관리자 > SEO 설정",
          "사이트 제목/설명/키워드 — 구글 검색 결과에 표시",
          "OG 이미지 — SNS 공유 시 표시되는 대표 이미지 (1200x630 권장)",
          "네이버/구글 사이트 인증 코드 — 검색엔진 등록",
          "Google Analytics ID — 방문자 분석",
          "robots.txt — 검색 봇 크롤링 규칙 (기본값 유지 권장)",
          "구글 검색 결과 미리보기로 확인 가능",
        ]} />
      </Section>

      <Section title="7. 사이트 설정">
        <SubSection title="7-1. 기본 설정 (/admin/settings)">
        <UL items={[
          "팀 로고 표시 토글 (중계/메인/분석/유튜브 개별)",
          "AI API 키 관리 (Claude/GPT/Gemini)",
          "레벨 표시 모드 (뱃지/이모지/숨김)",
        ]} />
        </SubSection>

        <SubSection title="7-2. 레벨 설정 (/admin/levels)">
        <P>레벨별 필요 EXP 설정. 채팅에 레벨 뱃지로 표시됨.</P>
        </SubSection>

        <SubSection title="7-3. 활동 보상 설정 (/admin/rewards)">
        <P>출석체크, 채팅, 분석글 작성 등 활동별 포인트/EXP 보상 설정.</P>
        </SubSection>
      </Section>

      <Section title="8. 팀 로고 관리">
        <UL items={[
          "현재 1000+개 팀 등록, WebP 자동 변환 적용",
          "중계 페이지에서 로고 없는 팀 발견 시:",
          "  1. TheSportsDB (https://www.thesportsdb.com) 또는 Wikipedia에서 이미지 다운로드",
          "  2. /public/team-logos/에 PNG 저장",
          "  3. cwebp -q 90 파일명.png -o 파일명.webp 로 WebP 변환",
          "  4. DB에 등록: prisma.teamLogo.create({ nameKr, nameEn, logoPath })",
          "  5. 서버 재시작 (캐시 갱신)",
          "",
          "동명팀 주의: nameKr이 unique 제약. '뉴욕' 같은 약어가 겹치면 풀네임 사용.",
        ]} />
      </Section>

      <Section title="9. 트러블슈팅">
        <Table headers={["증상", "원인", "해결"]} rows={[
          ["사이트 접속 안 됨", "server.js 프로세스 죽음", "kill -9 $(lsof -ti:3000) 후 재시작"],
          ["방송 화면 깜빡임", "플레이어 재생성 반복", "fetchBjs 폴링이 mainBj 객체를 변경하는지 확인"],
          ["채팅 안 보임", "Socket.IO 연결 실패", "nginx proxy_read_timeout 300s 확인, Cloudflare WebSocket 활성화"],
          ["출석체크 날짜 이상", "UTC/KST 혼용", "todayDateKST() 사용 여부 확인 (setHours(0,0,0,0) 금지)"],
          ["팀 로고 안 보임", "DB 미등록 또는 이름 불일치", "/api/team-logos 응답에서 팀명 키 확인"],
          ["자동 분석 전적 이상", "standings 매핑 실패", "DB TeamLogo의 nameEn과 standings 팀명 확인"],
          ["이미지 업로드 실패", "nginx client_max_body_size", "두 server 블록 모두 10M 확인"],
          ["빌드 에러", "타입 에러", "npm run build 후 에러 메시지 확인"],
        ]} />
      </Section>

      <Section title="10. 감사 로그">
        <UL items={[
          "관리자 > 통계/기록 > 감사 로그",
          "모든 관리자 설정 변경이 자동 기록됨",
          "기록 항목: 관리자 닉네임, 액션, 대상, 변경 내용, IP, 시간",
          "액션별 필터 + 키워드 검색 가능",
        ]} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-[15px] font-bold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-3"><h3 className="text-[13px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h3>{children}</div>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{children}</p>;
}
function UL({ items }: { items: string[] }) {
  return <ul className="list-disc ml-4 space-y-0.5">{items.map((item, i) => <li key={i} className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{item || "\u00A0"}</li>)}</ul>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]" style={{ border: "1px solid var(--border)" }}>
        <thead><tr style={{ background: "var(--bg)" }}>{headers.map(h => <th key={h} className="px-2 py-1.5 text-left font-bold" style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>{row.map((cell, j) => <td key={j} className="px-2 py-1.5" style={{ color: "var(--text-primary)" }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
