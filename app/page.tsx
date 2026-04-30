import Link from "next/link";
import Popup from "@/components/ui/Popup";
import AnalysisMobileSection from "@/components/ui/AnalysisMobileSection";
import LiveBanner from "@/components/ui/LiveBanner";
import MainVideoSection from "@/components/ui/MainVideoSection";
import { fetchYouTubeHighlights } from "@/lib/youtube";
import HighlightsSection from "@/components/ui/HighlightsSection";
import LiveGamesSection from "@/components/ui/LiveGamesSection";
import StandingsWidget from "@/components/ui/StandingsWidget";
import NoticeTicker from "@/components/ui/NoticeTicker";
import { prisma } from "@/lib/prisma";

const MOCK_POINTS = [
  { id: 1, name: "[스타벅스] e-카드 1만원", point: "10,000 P", img: "https://images.unsplash.com/photo-1622988694506-86a47ac1c52f?w=150&h=112&fit=crop&q=80" },
  { id: 2, name: "[스타벅스] e-카드 2만원", point: "20,000 P", img: "https://images.unsplash.com/photo-1622988694506-86a47ac1c52f?w=150&h=112&fit=crop&q=80" },
  { id: 3, name: "[쿠팡이츠] 상품권 1만원", point: "10,000 P", img: "https://images.pexels.com/photos/5926415/pexels-photo-5926415.jpeg?w=150&h=112&fit=crop" },
];

// ── 섹션 헤더 컴포넌트
function SectionHeader({ iconPos, primary, secondary, href }: {
  iconPos: string; primary: string; secondary: string; href?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 h-10">
      <div className="flex items-center gap-1 font-semibold" style={{ color: "var(--brand)" }}>
        <span
          className="inline-block w-6 h-6 bg-no-repeat"
          style={{
            backgroundImage: "url('https://spontv.com/_next/static/media/nav_icon_comm.1ec1f59e.svg')",
            backgroundPosition: iconPos,
            backgroundSize: "auto",
          }}
        />
        {primary}{" "}
        <span className="font-extrabold ml-1" style={{ color: "var(--text-primary)" }}>{secondary}</span>
      </div>
      {href && (
        <Link href={href} className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>더보기 +</Link>
      )}
    </div>
  );
}

// ── 회색 구분선
function Divider() {
  return <div className="w-full" style={{ height: 10, background: "var(--bg)" }} />;
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [highlights, events] = await Promise.all([
    fetchYouTubeHighlights(),
    prisma.event.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { _count: { select: { votes: true } } },
    }),
  ]);

  return (
    <>
      <Popup />

      {/* ════════════════════════════════════════
          데스크탑 레이아웃 (기존 유지)
      ════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col gap-2">

        {/* 영상 플레이어 (BJ 방송 중이면 실시간, 아니면 기본 영상) */}
        <MainVideoSection />

        {/* 공지 */}
        <NoticeTicker className="rounded-md h-7 flex items-center px-2 shadow-sm overflow-hidden" textClass="text-xs font-bold" />

        {/* 배너 */}
        <div className="flex justify-center gap-2">
          {[
            { label: "⭐ 프리미엄 분석", href: "/analysis/premium", bg: "linear-gradient(135deg, #d97706, #f59e0b)" },
            { label: "🎁 출석체크 이벤트", href: "/attendance", bg: "linear-gradient(135deg, #0ea5e9, #0369a1)" },
          ].map((b) => (
            <Link key={b.href} href={b.href} className="rounded-lg overflow-hidden flex items-center justify-center text-white font-bold text-sm"
              style={{ background: b.bg, width: "200px", height: "50px" }}>
              {b.label}
            </Link>
          ))}
        </div>

        {/* 중계 라이브 목록 (LIVE만) */}
        <LiveGamesSection layout="desktop" filter="live" />

        {/* 하이라이트 */}
        <div className="rounded-lg p-4 shadow-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold" style={{ color: "var(--brand)" }}>🎬 최신 하이라이트</h2>
            <a href="/youtube/highlights" className="text-xs font-bold underline" style={{ color: "var(--text-secondary)" }}>더보기 +</a>
          </div>
          <HighlightsSection videos={highlights} layout="desktop" />
        </div>

        {/* 대기 라이브 목록 (대기만) */}
        <LiveGamesSection layout="desktop" filter="waiting" title="⏳ 대기 라이브 목록" initialCount={10} />
      </div>

      {/* ════════════════════════════════════════
          모바일 레이아웃 (참고 디자인 기반 재설계)
      ════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col" style={{ background: "var(--bg)" }}>

        {/* ① 실시간 방송 (방송중일 때만 노출) */}
        <LiveBanner />

        {/* ② 공지 티커 */}
        <NoticeTicker className="m-2 p-2 px-3 rounded overflow-hidden" textClass="text-[12px]" />

        {/* ③ 실시간 중계 LIVE (상위 6개) */}
        <div style={{ background: "var(--surface)" }}>
          <SectionHeader iconPos="0px -24px" primary="실시간중계" secondary="LIVE" href="/broadcast" />
          <LiveGamesSection layout="mobile" maxCount={6} />
        </div>

        <Divider />

        {/* ④ 배너 */}
        <div className="px-2 py-2" style={{ background: "var(--surface)" }}>
          <div className="flex gap-2">
            {[
              { label: "⭐ 프리미엄 분석", href: "/analysis/premium", bg: "linear-gradient(135deg, #d97706, #f59e0b)" },
              { label: "🎁 출석체크", href: "/attendance", bg: "linear-gradient(135deg, #0ea5e9, #0369a1)" },
            ].map((b) => (
              <Link key={b.href} href={b.href}
                className="flex-1 h-[52px] rounded-lg flex items-center justify-center text-white font-bold text-[13px]"
                style={{ background: b.bg }}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>

        <Divider />

        {/* ⑤ 스포츠 하이라이트 */}
        <div style={{ background: "var(--surface)" }}>
          <SectionHeader iconPos="0px -190px" primary="스포츠" secondary="하이라이트" href="/youtube/highlights" />
          <HighlightsSection videos={highlights} layout="mobile" />
        </div>

        <Divider />

        <Divider />

        {/* ⑥ 이벤트 매치 */}
        <div className="px-2 py-1" style={{ background: "var(--surface)" }}>
          <SectionHeader iconPos="0px -168px" primary="이벤트" secondary="매치" href="/events" />
          {events.length === 0 ? (
            <p className="text-center text-[12px] py-4" style={{ color: "var(--text-secondary)" }}>진행 중인 이벤트가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 px-1 pb-3">
              {events.map((ev) => {
                const isOpen = new Date(ev.deadline) > new Date();
                return (
                  <li key={ev.id}>
                    <Link href={`/events/${ev.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(8,8,8,0.15)" }}>
                      {ev.bannerImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ev.bannerImg} alt="" className="flex-shrink-0 rounded overflow-hidden object-cover" style={{ width: 80, height: 52 }} />
                      ) : (
                        <div className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
                          style={{ width: 80, height: 52, background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                          <span className="text-2xl">🎮</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: isOpen ? "#16a34a" : "#6b7280" }}>
                            {isOpen ? "진행중" : "마감"}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
                            {ev.betType}
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold leading-snug line-clamp-1 mt-0.5" style={{ color: "var(--text-primary)" }}>{ev.title}</p>
                        <div className="flex items-center gap-2 text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          <span>{ev.teamA} vs {ev.teamB}</span>
                          <span>·</span>
                          <span>참여 {ev._count.votes}명</span>
                          <span>·</span>
                          <span>{ev.reward}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Divider />

        {/* ⑦ 포인트 전환 */}
        <div style={{ background: "var(--surface)" }}>
          <div className="flex items-center gap-1 font-semibold px-3 pt-3 pb-1" style={{ color: "var(--brand)" }}>
            <span className="inline-block w-6 h-6 bg-no-repeat" style={{ backgroundImage: "url('https://spontv.com/_next/static/media/nav_icon_comm.1ec1f59e.svg')", backgroundPosition: "0px -120px", backgroundSize: "auto" }} />
            포인트 <span className="font-extrabold ml-1" style={{ color: "var(--text-primary)" }}>전환</span>
          </div>
          <div className="flex items-center justify-between px-3 h-9">
            <span className="font-semibold text-[14px]" style={{ color: "var(--text-primary)" }}>스폰상품</span>
            <Link href="/points" className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>더보기 +</Link>
          </div>
          <div className="flex overflow-x-auto gap-2 px-3 pb-3" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
            {MOCK_POINTS.map((item) => (
              <div key={item.id} className="flex-none" style={{ width: 148, scrollSnapAlign: "start" }}>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <img src={item.img} alt={item.name} className="w-full object-cover" style={{ height: 110 }} />
                </div>
                <div className="mt-1 p-1 px-2 rounded text-center" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <p className="text-[12px] font-bold truncate">{item.name}</p>
                  <p className="text-[13px] font-bold" style={{ color: "var(--brand)" }}>{item.point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* ⑧ 스포츠 분석 */}
        <div className="px-2 py-1" style={{ background: "var(--surface)" }}>
          <SectionHeader iconPos="0px -48px" primary="스포츠" secondary="분석" href="/analysis/premium" />
          <AnalysisMobileSection />
        </div>

        <Divider />

        {/* ⑨ 스포츠 팀순위 (실시간) */}
        <div className="px-2 py-2" style={{ background: "var(--surface)" }}>
          <StandingsWidget />
        </div>

      </div>
    </>
  );
}
