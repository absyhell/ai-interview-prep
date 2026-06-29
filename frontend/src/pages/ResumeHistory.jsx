import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { PageShell } from "./Dashboard";
import { GitCompare, ArrowRight, Plus, FileText, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResumeHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [diff, setDiff] = useState(null);
  const [diffing, setDiffing] = useState(false);

  useEffect(() => {
    api.get("/resume/list").then((r) => setItems(r.data || [])).finally(() => setLoading(false));
  }, []);

  const opts = useMemo(() => items.map((it, idx) => ({
    value: it.id,
    label: `v${items.length - idx} · ${it.created_at?.slice(0, 10)} · ATS ${it.ats_score}`,
  })), [items]);

  const runDiff = async () => {
    if (!a || !b || a === b) return;
    setDiffing(true);
    try {
      const res = await api.post("/resume/diff", { a, b });
      setDiff(res.data);
    } finally {
      setDiffing(false);
    }
  };

  return (
    <PageShell title="Resume History" subtitle="Every version you've analyzed. Compare any two to see what changed.">
      <div className="flex items-center justify-between mb-6">
        <div className="grid-overline">All versions ({items.length})</div>
        <Link to="/resume" data-testid="new-resume-button" className="inline-flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">
          <Plus size={14} /> Score New Resume
        </Link>
      </div>

      {loading ? (
        <div className="font-mono text-xs tracking-widest text-muted-foreground">LOADING…</div>
      ) : items.length === 0 ? (
        <div className="brutal-card p-12 text-center">
          <FileText size={28} className="mx-auto mb-3 text-muted-foreground" />
          <div className="font-display text-xl font-bold">No resumes yet</div>
          <p className="text-sm text-muted-foreground mt-2">Score your first resume to begin tracking versions.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border mb-10" data-testid="resume-list">
          {items.map((it, idx) => (
            <li key={it.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid-overline">v{items.length - idx}</span>
                  <span className="text-xs font-mono text-muted-foreground">{it.created_at?.slice(0, 19).replace("T", " ")}</span>
                </div>
                <div className="font-display text-lg font-bold tracking-tight truncate mt-1">{it.summary?.slice(0, 110) || "(no summary)"}</div>
                <div className="text-xs text-muted-foreground mt-1">{it.missing_keywords?.length || 0} missing · {it.matched_keywords?.length || 0} matched</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-bold">{it.ats_score}<span className="text-sm text-muted-foreground">/100</span></span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length >= 2 && (
        <div className="brutal-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare size={16} />
            <div className="grid-overline">Compare versions</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] items-end gap-3" data-testid="resume-diff-pickers">
            <Picker label="Earlier" value={a} onChange={setA} options={opts} testid="diff-a" />
            <ArrowRight className="text-muted-foreground hidden sm:block" />
            <Picker label="Later" value={b} onChange={setB} options={opts} testid="diff-b" />
            <button onClick={runDiff} disabled={!a || !b || a === b || diffing} data-testid="run-diff" className="px-4 py-3 bg-foreground text-background text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground disabled:opacity-40">
              {diffing ? "Diffing…" : "Diff"}
            </button>
          </div>

          {diff && <DiffPanel diff={diff} />}
        </div>
      )}
    </PageShell>
  );
}

function Picker({ label, value, onChange, options, testid }) {
  return (
    <label className="block">
      <div className="grid-overline mb-2">{label}</div>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="w-full px-3 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono"
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function DiffPanel({ diff }) {
  const d = diff.ats_score_diff;
  const TrendIcon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  const trendCls = d > 0 ? "text-green-500 border-green-500" : d < 0 ? "text-red-500 border-red-500" : "border-border text-muted-foreground";

  return (
    <div className="mt-6 space-y-6 animate-fade-up" data-testid="resume-diff-result">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
        <div className="bg-card p-5">
          <div className="grid-overline">ATS Delta</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-bold">{diff.a.ats_score}</span>
            <ArrowRight size={16} className="mt-2" />
            <span className="font-mono text-3xl font-bold">{diff.b.ats_score}</span>
          </div>
          <span className={`inline-flex items-center gap-1 mt-2 px-2 py-1 border font-mono text-xs ${trendCls}`}>
            <TrendIcon size={11} /> {d > 0 ? "+" : ""}{d}
          </span>
        </div>
        <div className="bg-card p-5">
          <div className="grid-overline">Similarity</div>
          <div className="font-mono text-3xl font-bold mt-2">{diff.similarity}<span className="text-base text-muted-foreground">%</span></div>
          <div className="text-xs text-muted-foreground mt-2">Word-level overlap between v1 and v2.</div>
        </div>
        <div className="bg-card p-5">
          <div className="grid-overline">Gap activity</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-2xl font-bold text-green-500">−{diff.fixed_keywords.length}</span>
            <span className="text-xs text-muted-foreground">fixed</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-2xl font-bold text-red-500">+{diff.new_gaps.length}</span>
            <span className="text-xs text-muted-foreground">new gaps</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-green-500" />
            <div className="grid-overline">Newly covered keywords</div>
          </div>
          {diff.fixed_keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previously-missing keywords were added.</p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="fixed-keywords">
              {diff.fixed_keywords.map((k) => (
                <span key={k} className="px-2.5 py-1 border border-green-500 text-green-500 text-xs font-mono">{k}</span>
              ))}
            </div>
          )}
        </div>
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-red-500" />
            <div className="grid-overline">New gaps introduced</div>
          </div>
          {diff.new_gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new keyword gaps introduced.</p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="new-gaps">
              {diff.new_gaps.map((k) => (
                <span key={k} className="px-2.5 py-1 border border-red-500 text-red-500 text-xs font-mono">{k}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="brutal-card p-5">
        <div className="grid-overline mb-3">Word-level diff</div>
        <div className="text-sm leading-relaxed font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto scrollbar-thin" data-testid="word-diff">
          {diff.operations.map((op, i) => {
            if (op.op === "equal") {
              return <span key={i} className="text-muted-foreground">{op.a.join(" ") + " "}</span>;
            }
            if (op.op === "insert") {
              return <span key={i} className="bg-green-500/15 text-green-600 dark:text-green-400 border-b border-green-500/40">{op.b.join(" ") + " "}</span>;
            }
            if (op.op === "delete") {
              return <span key={i} className="bg-red-500/15 text-red-600 dark:text-red-400 line-through border-b border-red-500/40">{op.a.join(" ") + " "}</span>;
            }
            // replace
            return (
              <span key={i}>
                <span className="bg-red-500/15 text-red-600 dark:text-red-400 line-through">{op.a.join(" ")}</span>
                {" "}
                <span className="bg-green-500/15 text-green-600 dark:text-green-400">{op.b.join(" ")}</span>
                {" "}
              </span>
            );
          })}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-3">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/30 border border-green-500/60"></span> Added</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/30 border border-red-500/60"></span> Removed</span>
        </div>
      </div>
    </div>
  );
}
