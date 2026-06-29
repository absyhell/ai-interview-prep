import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Flame, TrendingUp, Award, FileText, MessageSquare, ArrowUpRight, Clock,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

const CATEGORY_LABEL = { technical: "Tech", dsa: "DSA", core: "Core", hr: "HR" };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageShell title="Dashboard"><Loader /></PageShell>;
  const empty = !stats || stats.total_interviews === 0;

  return (
    <PageShell title="Dashboard" subtitle={`Welcome back, ${user?.name?.split(" ")[0] || "there"}.`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border" data-testid="kpi-grid">
        <KPI icon={Flame} label="Current streak" value={`${stats?.streak_days || 0}d`} sub={`Best: ${stats?.best_streak || 0}d`} testid="kpi-streak" />
        <KPI icon={TrendingUp} label="Avg score" value={`${stats?.average_score?.toFixed(1) || "—"}`} sub="out of 10" testid="kpi-avg" />
        <KPI icon={Award} label="Best score" value={`${stats?.best_score?.toFixed(1) || "—"}`} sub="personal best" testid="kpi-best" />
        <KPI icon={MessageSquare} label="Sessions" value={stats?.total_interviews || 0} sub={`${stats?.total_resumes || 0} resumes scored`} testid="kpi-total" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 brutal-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="grid-overline">A. Performance Trend</div>
              <h3 className="font-display text-2xl font-bold tracking-tight mt-1">Scores over time</h3>
            </div>
          </div>
          {empty || (stats.scores_over_time || []).length < 2 ? (
            <EmptyChart message="Complete two or more mock interviews to see your trend." />
          ) : (
            <div className="h-72" data-testid="trend-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.scores_over_time}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="brutal-card p-6">
          <div className="grid-overline">B. Skill map</div>
          <h3 className="font-display text-2xl font-bold tracking-tight mt-1 mb-4">Weak areas</h3>
          {empty || (stats.category_breakdown || []).length === 0 ? (
            <EmptyChart message="Take a mock interview to see your category breakdown." />
          ) : (
            <div className="h-64" data-testid="radar-chart">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={(stats.category_breakdown || []).map(c => ({ ...c, label: CATEGORY_LABEL[c.category] || c.category }))}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <PolarRadiusAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Radar name="Avg" dataKey="average_score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 brutal-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="grid-overline">C. Recent</div>
              <h3 className="font-display text-2xl font-bold tracking-tight mt-1">Latest interviews</h3>
            </div>
            <Link to="/interview/new" className="text-xs uppercase tracking-widest border border-border px-3 py-2 hover:bg-foreground hover:text-background transition-colors" data-testid="new-interview-cta">
              New interview <ArrowUpRight className="inline" size={12} />
            </Link>
          </div>
          {(stats?.recent_interviews || []).length === 0 ? (
            <EmptyChart message="No interview attempts yet. Start your first one." />
          ) : (
            <ul className="divide-y divide-border" data-testid="recent-list">
              {stats.recent_interviews.map((it) => (
                <li key={it.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{it.role}</div>
                    <div className="text-xs text-muted-foreground font-mono">{it.created_at?.slice(0, 10)} · {it.difficulty}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-2xl font-bold">{it.overall_score?.toFixed(1)}</span>
                    <Link to={`/interview/${it.id}`} className="text-xs uppercase tracking-widest border border-border px-3 py-2 hover:bg-foreground hover:text-background transition-colors">
                      Review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="brutal-card p-6">
          <div className="grid-overline">D. Tips</div>
          <h3 className="font-display text-2xl font-bold tracking-tight mt-1 mb-4">Personal coach</h3>
          <ul className="space-y-3">
            {(stats?.tips || ["Take your first mock interview to get tailored tips."]).map((t, i) => (
              <li key={i} className="text-sm border-l-2 border-foreground pl-3 leading-relaxed">{t}</li>
            ))}
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link to="/resume" data-testid="quick-resume" className="border border-border p-4 hover:bg-foreground hover:text-background transition-colors group">
              <FileText size={18} />
              <div className="text-sm font-semibold mt-2">Score resume</div>
              <div className="text-xs text-muted-foreground group-hover:text-background/70">vs JD</div>
            </Link>
            <Link to="/interview/new" data-testid="quick-interview" className="border border-border p-4 hover:bg-foreground hover:text-background transition-colors group">
              <MessageSquare size={18} />
              <div className="text-sm font-semibold mt-2">Mock</div>
              <div className="text-xs text-muted-foreground group-hover:text-background/70">5–7 questions</div>
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function KPI({ icon: Icon, label, value, sub, testid }) {
  return (
    <div className="bg-card p-6 hover-lift" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="grid-overline">{label}</div>
        <Icon size={14} className="text-muted-foreground" />
      </div>
      <div className="font-mono text-4xl font-bold mt-3 tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground flex items-center justify-center min-h-[180px]">
      <div className="flex items-center gap-2"><Clock size={14} /> {message}</div>
    </div>
  );
}

function Loader() {
  return <div className="font-mono text-xs text-muted-foreground tracking-widest">LOADING DASHBOARD...</div>;
}

export function PageShell({ title, subtitle, children }) {
  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1400px] mx-auto animate-fade-up">
      <header className="mb-8">
        <div className="grid-overline">PrepStack /</div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter mt-1">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
