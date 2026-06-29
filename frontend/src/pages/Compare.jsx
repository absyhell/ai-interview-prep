import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { PageShell } from "./Dashboard";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function Compare() {
  const [list, setList] = useState([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/interview/list").then((r) => setList(r.data || []));
  }, []);

  useEffect(() => {
    if (!a || !b || a === b) { setResult(null); return; }
    setBusy(true);
    api.post("/interview/compare", { a, b })
      .then((r) => setResult(r.data))
      .catch(() => setResult(null))
      .finally(() => setBusy(false));
  }, [a, b]);

  const opts = useMemo(() => list.map((it) => ({
    value: it.id,
    label: `${it.role} · ${it.difficulty} · ${it.overall_score?.toFixed(1)} (${it.created_at?.slice(0, 10)})`
  })), [list]);

  if (list.length < 2) {
    return (
      <PageShell title="Compare Interviews" subtitle="Pick any two attempts to see your delta.">
        <div className="brutal-card p-12 text-center">
          <div className="font-display text-xl font-bold">Need at least 2 attempts</div>
          <p className="text-sm text-muted-foreground mt-2">Take more interviews to start comparing your performance.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Compare Interviews" subtitle="See exactly where you improved.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8" data-testid="compare-pickers">
        <Picker label="Interview A (earlier)" value={a} onChange={setA} options={opts} testid="picker-a" />
        <Picker label="Interview B (later)" value={b} onChange={setB} options={opts} testid="picker-b" />
      </div>

      {busy && <div className="font-mono text-xs text-muted-foreground tracking-widest">COMPUTING DELTA…</div>}

      {result && (
        <div className="space-y-6 animate-fade-up" data-testid="compare-result">
          <div className="brutal-card p-8 text-center">
            <div className="grid-overline">Overall delta</div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <span className="font-mono text-4xl font-bold">{result.a.overall_score?.toFixed(1)}</span>
              <ArrowRight size={28} />
              <span className="font-mono text-4xl font-bold">{result.b.overall_score?.toFixed(1)}</span>
              <DeltaPill v={result.overall_diff} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {Object.entries(result.category_diff).map(([c, v]) => (
              <div key={c} className="bg-card p-5">
                <div className="grid-overline">{c}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-2xl font-bold">{(result.a.category_scores?.[c] ?? 0).toFixed(1)}</span>
                  <ArrowRight size={14} />
                  <span className="font-mono text-2xl font-bold">{(result.b.category_scores?.[c] ?? 0).toFixed(1)}</span>
                </div>
                <DeltaPill v={v} />
              </div>
            ))}
          </div>
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

function DeltaPill({ v }) {
  const sign = v > 0 ? "+" : "";
  const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  const cls = v > 0 ? "text-green-500 border-green-500" : v < 0 ? "text-red-500 border-red-500" : "text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 border font-mono text-xs ${cls}`}>
      <Icon size={12} /> {sign}{v?.toFixed(1)}
    </span>
  );
}
