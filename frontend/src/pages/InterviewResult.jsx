import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { PageShell } from "./Dashboard";
import { ChevronLeft, Award, Volume2, VolumeX } from "lucide-react";
import { speak, stopSpeaking } from "@/lib/voice";

const CAT_COLORS = {
  technical: "border-foreground",
  dsa: "border-primary",
  core: "border-foreground",
  hr: "border-foreground",
};

export default function InterviewResult() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/interview/${id}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageShell title="Loading…"></PageShell>;
  if (!data) return <PageShell title="Not found"><Link to="/interview" className="underline">Back to interviews</Link></PageShell>;

  const score = data.overall_score;
  const verdict = score >= 8 ? "Excellent" : score >= 6 ? "Solid" : score >= 4 ? "Needs Work" : "Foundational gaps";

  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1400px] mx-auto animate-fade-up">
      <Link to="/interview" data-testid="back-to-interview" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft size={12} /> Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 brutal-card p-8">
          <div className="grid-overline">{data.role} · {data.difficulty.toUpperCase()}</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-2">Interview Report</h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono">{data.created_at?.slice(0, 19).replace("T", " ")}</p>
        </div>
        <div className="brutal-card p-8 flex flex-col justify-between">
          <div>
            <div className="grid-overline">Overall</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-mono text-7xl font-bold tracking-tighter" data-testid="overall-score">{score?.toFixed(1)}</span>
              <span className="text-2xl text-muted-foreground font-mono">/10</span>
            </div>
            <div className="grid-overline mt-1">{verdict}</div>
          </div>
          <Award className="ml-auto text-muted-foreground" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-6">
        {Object.entries(data.category_scores || {}).map(([cat, val]) => (
          <div key={cat} className="bg-card p-5">
            <div className="grid-overline">{cat}</div>
            <div className="font-mono text-3xl font-bold mt-2">{val?.toFixed(1)}<span className="text-base text-muted-foreground">/10</span></div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {(data.evaluations || []).map((e, i) => (
          <div key={e.question_id} className={`brutal-card p-6 border-l-4 ${CAT_COLORS[e.category] || "border-foreground"}`} data-testid={`eval-${i}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <div className="grid-overline">Q{i + 1} · {e.category}</div>
                <h3 className="font-display text-xl font-bold tracking-tight mt-1">{e.question}</h3>
              </div>
              <div className="text-right">
                <div className="font-mono text-4xl font-bold">{e.score?.toFixed(1)}<span className="text-base text-muted-foreground">/10</span></div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  R {e.relevance?.toFixed(1)} · T {e.technical?.toFixed(1)} · C {e.clarity?.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <div>
                <div className="grid-overline mb-2">Your answer</div>
                <div className="text-sm font-mono whitespace-pre-wrap leading-relaxed border border-border bg-accent/40 p-3 min-h-[80px]">{e.user_answer || <span className="text-muted-foreground italic">No answer provided</span>}</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="grid-overline">Sample answer</div>
                  <SpeakButton text={e.sample_answer} testid={`tts-${i}`} />
                </div>
                <div className="text-sm leading-relaxed border border-foreground p-3 min-h-[80px]">{e.sample_answer}</div>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <div className="grid-overline mb-1">Feedback</div>
              <p className="text-sm leading-relaxed">{e.feedback}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function SpeakButton({ text, testid }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && !window.speechSynthesis?.speaking) {
        setPlaying(false);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [playing]);

  const toggle = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
    } else {
      const ok = speak(text);
      if (ok) setPlaying(true);
    }
  };

  if (!("speechSynthesis" in window)) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid={testid}
      aria-label={playing ? "Stop playback" : "Play sample answer"}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-border text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
    >
      {playing ? <VolumeX size={11} /> : <Volume2 size={11} />} {playing ? "Stop" : "Listen"}
    </button>
  );
}
