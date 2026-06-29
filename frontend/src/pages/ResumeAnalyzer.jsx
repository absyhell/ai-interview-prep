import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { PageShell } from "./Dashboard";
import { Upload, FileText, Target, AlertCircle, CheckCircle2, X, History } from "lucide-react";
import { toast } from "sonner";

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("PDF files only");
      return;
    }
    setFile(f);
    setResumeText("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file && !resumeText.trim()) { toast.error("Upload a PDF or paste resume text"); return; }
    if (!jobDescription.trim()) { toast.error("Job description is required"); return; }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("job_description", jobDescription);
      if (resumeText.trim()) fd.append("resume_text", resumeText);
      if (file) fd.append("file", file);
      const res = await api.post("/resume/analyze", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
      setResult(res.data);
      toast.success("Analysis complete");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title="Resume Analyzer" subtitle="Compare your resume against any job description for an instant ATS score.">
      <div className="flex justify-end mb-4">
        <Link to="/resume/history" data-testid="goto-resume-history" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest border border-border px-3 py-2 hover:bg-foreground hover:text-background transition-colors">
          <History size={12} /> View history
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="space-y-6" data-testid="resume-form">
          <div className="brutal-card p-6">
            <div className="grid-overline mb-3">01 / Upload Resume</div>
            <label
              className="block border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-foreground transition-colors"
              data-testid="resume-dropzone"
            >
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} data-testid="resume-file-input" />
              {file ? (
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={20} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }} className="p-1 hover:bg-accent" data-testid="resume-remove">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-3 text-muted-foreground" size={28} />
                  <div className="font-semibold">Drop or click to upload PDF</div>
                  <div className="text-xs text-muted-foreground mt-1">Or paste your resume text below</div>
                </>
              )}
            </label>
            <textarea
              placeholder="Or paste resume text here…"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              data-testid="resume-text-input"
              className="mt-4 w-full px-3 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono min-h-[120px]"
            />
          </div>

          <div className="brutal-card p-6">
            <div className="grid-overline mb-3">02 / Job Description</div>
            <textarea
              required
              placeholder="Paste the full job description…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              data-testid="jd-input"
              className="w-full px-3 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono min-h-[200px]"
            />
          </div>

          <button
            type="submit" disabled={busy} data-testid="analyze-button"
            className="w-full py-3.5 bg-foreground text-background font-semibold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
          >
            {busy ? "Analyzing with AI…" : "Analyze Resume"}
          </button>
        </form>

        <div className="space-y-6">
          {!result && !busy && (
            <div className="brutal-card p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
              <Target size={32} className="text-muted-foreground mb-4" />
              <div className="font-display text-xl font-bold tracking-tight">Your ATS report appears here</div>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">Upload a resume + job description to see keyword match, missing skills, and improvements.</p>
            </div>
          )}

          {busy && (
            <div className="brutal-card p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="font-mono text-sm tracking-widest text-muted-foreground">SCANNING RESUME · MATCHING KEYWORDS · GENERATING REPORT</div>
              <div className="mt-4 w-32 h-1 bg-border overflow-hidden">
                <div className="h-full w-1/3 bg-foreground animate-pulse"></div>
              </div>
            </div>
          )}

          {result && <ResultPanel result={result} />}
        </div>
      </div>
    </PageShell>
  );
}

function ResultPanel({ result }) {
  const score = result.ats_score || 0;
  const verdict = score >= 80 ? "Strong Match" : score >= 60 ? "Decent Match" : score >= 40 ? "Needs Work" : "Major Gaps";
  return (
    <div className="space-y-6 animate-fade-up" data-testid="resume-result">
      <div className="brutal-card p-6">
        <div className="grid-overline">ATS Score</div>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="font-mono text-7xl font-bold tracking-tighter" data-testid="ats-score">{score}</span>
          <span className="text-2xl text-muted-foreground font-mono">/100</span>
        </div>
        <div className="mt-2 grid-overline">{verdict}</div>
        <div className="mt-4 h-2 bg-border">
          <div className="h-full bg-foreground" style={{ width: `${score}%` }}></div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{result.summary}</p>
      </div>

      <Section title="Missing keywords" icon={AlertCircle} testid="missing-keywords">
        {result.missing_keywords?.length ? (
          <div className="flex flex-wrap gap-2">
            {result.missing_keywords.map((k) => (
              <span key={k} className="px-2.5 py-1 border border-destructive text-destructive text-xs font-mono">{k}</span>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No major gaps detected.</p>}
      </Section>

      <Section title="Matched keywords" icon={CheckCircle2} testid="matched-keywords">
        <div className="flex flex-wrap gap-2">
          {(result.matched_keywords || []).map((k) => (
            <span key={k} className="px-2.5 py-1 border border-border bg-accent text-xs font-mono">{k}</span>
          ))}
        </div>
      </Section>

      <Section title="Strengths" testid="strengths">
        <ul className="space-y-2">
          {(result.strengths || []).map((s, i) => <li key={i} className="text-sm border-l-2 border-foreground pl-3">{s}</li>)}
        </ul>
      </Section>

      <Section title="Improvement suggestions" testid="suggestions">
        <ol className="space-y-3 list-none">
          {(result.suggestions || []).map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="font-mono font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children, testid }) {
  return (
    <div className="brutal-card p-6" data-testid={testid}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={14} />}
        <div className="grid-overline">{title}</div>
      </div>
      {children}
    </div>
  );
}
