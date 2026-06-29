import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { PageShell } from "./Dashboard";
import { Plus, ChevronRight } from "lucide-react";

export default function InterviewList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/interview/list").then((r) => setItems(r.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="Mock Interviews" subtitle="Start a new session or review past ones.">
      <div className="flex items-center justify-between mb-6">
        <div className="grid-overline">All sessions ({items.length})</div>
        <Link to="/interview/new" data-testid="new-interview-button" className="inline-flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">
          <Plus size={14} /> New Interview
        </Link>
      </div>

      {loading ? (
        <div className="font-mono text-xs tracking-widest text-muted-foreground">LOADING…</div>
      ) : items.length === 0 ? (
        <div className="brutal-card p-12 text-center">
          <div className="font-display text-xl font-bold">No interviews yet</div>
          <p className="text-sm text-muted-foreground mt-2">Generate your first AI mock interview in under a minute.</p>
          <Link to="/interview/new" className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-foreground text-background text-xs uppercase tracking-widest">
            <Plus size={14} /> Start Now
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border" data-testid="interview-list">
          {items.map((it) => (
            <li key={it.id}>
              <Link to={`/interview/${it.id}`} className="flex items-center justify-between p-5 hover:bg-accent transition-colors">
                <div className="min-w-0">
                  <div className="font-display text-lg font-bold tracking-tight truncate">{it.role}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    {it.created_at?.slice(0, 10)} · {it.difficulty.toUpperCase()} · {it.evaluations?.length || 0}Q
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-3xl font-bold">{it.overall_score?.toFixed(1)}</span>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
