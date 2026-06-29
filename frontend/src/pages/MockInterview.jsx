import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageShell } from "./Dashboard";
import { toast } from "sonner";
import { Timer, Play, ChevronRight, Trophy, Mic, Square, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "@/lib/voice";

const ROLES = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Data Analyst",
  "Data Scientist",
  "Product Manager",
  "DevOps Engineer",
  "Machine Learning Engineer",
];
const DIFFICULTIES = ["easy", "medium", "hard"];
const COMPANIES = ["Any", "Google", "Amazon", "Meta", "Apple", "Microsoft", "Netflix"];

export default function MockInterview() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("setup"); // setup | active | submitting
  const [role, setRole] = useState(ROLES[0]);
  const [difficulty, setDifficulty] = useState("medium");
  const [company, setCompany] = useState("Any");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const startedAtRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startInterview = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post("/interview/generate", {
        role, difficulty, num_questions: 5,
        company: company === "Any" ? null : company,
      }, { timeout: 120000 });
      setSession(res.data);
      setAnswers({});
      setCurrent(0);
      setPhase("active");
      startedAtRef.current = Date.now();
      if (timerEnabled) {
        const total = res.data.questions.length * 180;
        setSecondsLeft(total);
        timerRef.current = setInterval(() => {
          setSecondsLeft((s) => {
            if (s <= 1) {
              clearInterval(timerRef.current);
              toast.warning("Time's up — submit when ready");
              return 0;
            }
            return s - 1;
          });
        }, 1000);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not start interview");
    } finally {
      setBusy(false);
    }
  };

  const submitInterview = async () => {
    if (!session) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");
    setBusy(true);
    try {
      const payload = {
        session_id: session.session_id,
        role: session.role,
        difficulty: session.difficulty,
        company: session.company || null,
        questions: session.questions,
        answers: session.questions.map((q) => ({ question_id: q.id, answer: answers[q.id] || "" })),
        duration_seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
      };
      const res = await api.post("/interview/evaluate", payload, { timeout: 180000 });
      toast.success("Interview evaluated");
      navigate(`/interview/${res.data.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Evaluation failed");
      setPhase("active");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "setup") {
    return (
      <PageShell title="Mock Interview" subtitle="Pick a role, set difficulty, hit start. AI grades every answer.">
        <form onSubmit={startInterview} className="grid lg:grid-cols-3 gap-6 max-w-5xl">
          <div className="brutal-card p-6 lg:col-span-2 space-y-6">
            <div>
              <div className="grid-overline mb-3">01 / Role</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="role-grid">
                {ROLES.map((r) => (
                  <button
                    type="button" key={r} onClick={() => setRole(r)}
                    data-testid={`role-${r.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`p-3 border text-sm text-left transition-colors ${role === r ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="grid-overline mb-3">02 / Difficulty</div>
              <div className="grid grid-cols-3 gap-2" data-testid="difficulty-grid">
                {DIFFICULTIES.map((d) => (
                  <button
                    type="button" key={d} onClick={() => setDifficulty(d)}
                    data-testid={`difficulty-${d}`}
                    className={`p-3 border text-sm uppercase tracking-widest transition-colors ${difficulty === d ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="grid-overline mb-3">03 / Company pack <span className="ml-2 normal-case tracking-normal text-[10px] text-muted-foreground">(optional — tailors questions to company style)</span></div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2" data-testid="company-grid">
                {COMPANIES.map((c) => (
                  <button
                    type="button" key={c} onClick={() => setCompany(c)}
                    data-testid={`company-${c.toLowerCase()}`}
                    className={`p-3 border text-sm transition-colors ${company === c ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="grid-overline mb-3">04 / Timer</div>
              <label className="flex items-center gap-3 p-3 border border-border cursor-pointer">
                <input type="checkbox" checked={timerEnabled} onChange={(e) => setTimerEnabled(e.target.checked)} data-testid="timer-toggle" className="accent-foreground" />
                <div>
                  <div className="text-sm font-semibold">Enable timer (3 min / question)</div>
                  <div className="text-xs text-muted-foreground">Adds pressure. Recommended for realistic prep.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="brutal-card p-6 flex flex-col">
            <div className="grid-overline">Summary</div>
            <h3 className="font-display text-3xl font-black tracking-tighter mt-1">Ready?</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Role</span><span className="font-mono">{role}</span></li>
              <li className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Difficulty</span><span className="font-mono uppercase">{difficulty}</span></li>
              <li className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Company</span><span className="font-mono">{company}</span></li>
              <li className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Questions</span><span className="font-mono">5</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Timer</span><span className="font-mono">{timerEnabled ? "ON" : "OFF"}</span></li>
            </ul>
            <button
              type="submit" disabled={busy} data-testid="start-interview-button"
              className="mt-auto pt-4 mt-6 py-3.5 bg-foreground text-background font-semibold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? "Generating questions…" : <><Play size={14} /> Start Interview</>}
            </button>
          </div>
        </form>
      </PageShell>
    );
  }

  if (phase === "submitting") {
    return (
      <PageShell title="Evaluating…" subtitle="The AI is grading every answer. Hang tight.">
        <div className="brutal-card p-12 text-center">
          <Trophy size={32} className="mx-auto mb-4" />
          <div className="font-mono text-xs tracking-widest text-muted-foreground">SCORING RELEVANCE · TECHNICAL · CLARITY</div>
        </div>
      </PageShell>
    );
  }

  // Active phase
  const q = session.questions[current];
  const answeredCount = session.questions.filter((qq) => (answers[qq.id] || "").trim().length > 0).length;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="px-6 lg:px-12 py-10 max-w-5xl mx-auto animate-fade-up">
      <header className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <div>
          <div className="grid-overline">{session.role} · {session.difficulty.toUpperCase()}{session.company ? ` · ${session.company}` : ""}</div>
          <h1 className="font-display text-2xl font-bold tracking-tight mt-1">Question {current + 1}/{session.questions.length}</h1>
        </div>
        {timerEnabled && (
          <div className="flex items-center gap-2 border border-border px-3 py-2" data-testid="timer-display">
            <Timer size={14} />
            <span className="font-mono text-lg">{fmt(secondsLeft)}</span>
          </div>
        )}
      </header>

      <div className="flex gap-1.5 mb-6" data-testid="question-progress">
        {session.questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setCurrent(i)} className={`flex-1 h-1.5 ${i === current ? "bg-foreground" : answers[qq.id]?.trim() ? "bg-foreground/40" : "bg-border"}`} aria-label={`go to question ${i + 1}`} />
        ))}
      </div>

      <ActiveQuestion
        q={q}
        value={answers[q.id] || ""}
        onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
        onAppend={(extra) => setAnswers((prev) => ({ ...prev, [q.id]: ((prev[q.id] || "") + (prev[q.id] ? " " : "") + extra).trim() }))}
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
        <button
          type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
          data-testid="prev-question"
          className="px-5 py-3 border border-border text-sm uppercase tracking-widest hover:bg-accent disabled:opacity-40"
        >
          Previous
        </button>
        <div className="text-xs text-muted-foreground font-mono text-center">{answeredCount}/{session.questions.length} answered</div>
        {current < session.questions.length - 1 ? (
          <button
            type="button" onClick={() => setCurrent((c) => c + 1)}
            data-testid="next-question"
            className="px-5 py-3 bg-foreground text-background text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2"
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button" onClick={submitInterview} disabled={busy}
            data-testid="submit-interview"
            className="px-5 py-3 bg-foreground text-background text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit & Evaluate"}
          </button>
        )}
      </div>
    </div>
  );
}


function ActiveQuestion({ q, value, onChange, onAppend }) {
  const { recording, transcribing, start, stop } = useVoiceRecorder({ onTranscript: onAppend });

  return (
    <div className="brutal-card p-8" data-testid="active-question">
      <div className="flex items-center gap-2 grid-overline">
        <span>{q.category}</span>
        <span>·</span>
        <span>{q.difficulty}</span>
      </div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-3 leading-snug">{q.text}</h2>

      <div className="relative mt-6">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here, or tap the mic to dictate…"
          data-testid="answer-textarea"
          className="w-full px-4 py-4 pr-16 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono min-h-[260px] leading-relaxed"
        />
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={transcribing}
          data-testid="voice-record-button"
          aria-label={recording ? "Stop recording" : "Start voice answer"}
          className={`absolute bottom-3 right-3 w-11 h-11 flex items-center justify-center border transition-all ${
            recording
              ? "bg-destructive text-destructive-foreground border-destructive animate-pulse"
              : transcribing
              ? "bg-accent border-border"
              : "bg-foreground text-background border-foreground hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          {transcribing ? <Loader2 size={16} className="animate-spin" /> : recording ? <Square size={16} /> : <Mic size={16} />}
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>
          {recording && <span className="text-destructive font-mono">● RECORDING — tap stop when done</span>}
          {transcribing && <span className="font-mono">TRANSCRIBING…</span>}
          {!recording && !transcribing && <span>Type or speak. Whisper transcribes your voice instantly.</span>}
        </span>
        <span className="font-mono">{value.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  );
}
