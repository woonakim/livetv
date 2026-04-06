"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { SPORT_CATEGORIES } from "@/lib/constants";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import TeamInput from "@/components/ui/TeamInput";
import MatchPicker from "@/components/ui/MatchPicker";
import SchedulePicker from "@/components/ui/SchedulePicker";

export default function AnalysisEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProviders, setAiProviders] = useState<{ anthropic?: boolean; openai?: boolean; gemini?: boolean }>({});

  const [sport, setSport] = useState("soccer");
  const [league, setLeague] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchHour, setMatchHour] = useState("18");
  const [matchMinute, setMatchMinute] = useState("00");
  const [homeTeam, setHomeTeam] = useState("");
  const [homeRecord, setHomeRecord] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [awayRecord, setAwayRecord] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [prediction, setPrediction] = useState("");
  const [odds, setOdds] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetch("/api/team-logos").then(r => r.json()).then(setLogoMap).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => {
      setAiProviders({ anthropic: s.anthropicEnabled, openai: s.openaiEnabled, gemini: s.geminiEnabled });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/analysis/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(post => {
        setSport(post.sport);
        setLeague(post.league);
        const mt = new Date(post.matchTime);
        setMatchDate(mt.toISOString().slice(0, 10));
        setMatchHour(String(mt.getHours()).padStart(2, "0"));
        setMatchMinute(String(Math.round(mt.getMinutes() / 5) * 5).padStart(2, "0"));
        setHomeTeam(post.home.name);
        setHomeRecord(post.home.record);
        setAwayTeam(post.away.name);
        setAwayRecord(post.away.record);
        setTitle(post.title);
        setContent(post.content);
        setPrediction(post.prediction);
        setOdds(post.odds);
        setIsPremium(post.isPremium);
      })
      .catch(() => router.push("/analysis"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/analysis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, league, matchTime: `${matchDate}T${matchHour}:${matchMinute}`, homeTeam, homeLogo: logoMap[homeTeam] || "", homeRecord, awayTeam, awayLogo: logoMap[awayTeam] || "", awayRecord, title, content, prediction, odds, isPremium }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/analysis/${id}`);
      } else {
        alert(data.error || "수정 실패");
      }
    } catch {
      alert("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiGenerate = async (provider: "anthropic" | "openai" | "gemini") => {
    if (!homeTeam || !awayTeam) { alert("홈팀과 원정팀을 먼저 입력해주세요."); return; }
    if (content.trim() && !confirm("현재 내용을 AI 분석으로 교체하시겠습니까?")) return;
    setAiLoading(true);
    setContent("");
    try {
      const res = await fetch("/api/analysis/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, league, homeTeam, awayTeam, homeRecord, awayRecord, provider }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "AI 생성 실패");
        setAiLoading(false);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) { accumulated += data.text; setContent(accumulated); }
            if (data.error) { alert(data.error); break; }
          } catch {}
        }
      }
    } catch { alert("네트워크 오류"); }
    finally { setAiLoading(false); }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-8 h-8 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} />
      </div>
    );
  }

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-lg font-black" style={{ color: "var(--brand)" }}>📝 분석 포스트 수정</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowPicker(true)} className="text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: "var(--brand)" }}>
            🏆 스코어보드에서 선택
          </button>
          <button type="button" onClick={() => setShowSchedule(true)} className="text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: "#f59e0b" }}>
            📅 다음 일정에서 선택
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>종목</label>
            <select value={sport} onChange={e => setSport(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              {SPORT_CATEGORIES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>리그</label>
            <input value={league} onChange={e => setLeague(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} required />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>경기 시간</label>
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} required />
            <select value={matchHour} onChange={e => setMatchHour(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => (
                <option key={h} value={h}>{h}시</option>
              ))}
            </select>
            <select value={matchMinute} onChange={e => setMatchMinute(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(m => (
                <option key={m} value={m}>{m}분</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TeamInput label="홈팀" value={homeTeam} onChange={setHomeTeam} logoMap={logoMap} record={homeRecord} onRecordChange={setHomeRecord} />
          <TeamInput label="원정팀" value={awayTeam} onChange={setAwayTeam} logoMap={logoMap} record={awayRecord} onRecordChange={setAwayRecord} />
        </div>

        <div>
          <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>분석 제목</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} required />
        </div>

        <div>
          <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>분석 내용</label>
          <MarkdownEditor value={content} onChange={setContent} rows={12} onAiGenerate={handleAiGenerate} aiLoading={aiLoading} aiProviders={aiProviders} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>예측</label>
            <input value={prediction} onChange={e => setPrediction(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} required />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>배당률 (선택)</label>
            <input value={odds} onChange={e => setOdds(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>프리미엄 콘텐츠</span>
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 rounded-lg text-sm font-bold" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            취소
          </button>
          <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "var(--brand)", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "수정 중..." : "수정하기"}
          </button>
        </div>
      </form>

      {showPicker && (
        <MatchPicker
          onPick={(result) => {
            setSport(result.sport);
            setLeague(result.league);
            setHomeTeam(result.homeTeam);
            setHomeRecord(result.homeRecord);
            setAwayTeam(result.awayTeam);
            setAwayRecord(result.awayRecord);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showSchedule && (
        <SchedulePicker
          onPick={(result) => {
            setSport(result.sport);
            setLeague(result.league);
            setHomeTeam(result.homeTeam);
            setHomeRecord(result.homeRecord || "");
            setAwayTeam(result.awayTeam);
            setAwayRecord(result.awayRecord || "");
            const d = new Date(result.matchTime);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            setMatchDate(`${y}-${m}-${day}`);
            setMatchHour(String(d.getHours()).padStart(2, "0"));
            setMatchMinute(String(Math.round(d.getMinutes() / 5) * 5).padStart(2, "0"));
          }}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}
