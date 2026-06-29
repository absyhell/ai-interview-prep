# PRD — AI Mock Interview & Resume Analyzer (PrepStack)

## Original Problem Statement
Build a production-ready full-stack web app called "AI Mock Interview & Resume Analyzer" with auth, resume ATS analysis, AI mock interviews with evaluation, dashboard, dark mode, sidebar navigation, and progress tracking.

## Tech / Architecture
- **Backend**: FastAPI + MongoDB (motor) + JWT (PyJWT) + bcrypt + emergentintegrations (GPT-5.2) + pypdf
- **Frontend**: React 19, Tailwind, shadcn/ui primitives, recharts, sonner, lucide-react
- **Auth**: JWT (Bearer) stored in localStorage
- **LLM**: GPT-5.2 via Emergent Universal LLM Key

## Personas
- Job seekers preparing for interviews (SWE, DA, PM, etc.)
- Career switchers needing structured ATS resume feedback

## What's Implemented (2026-02)
- JWT signup/login/logout, /auth/me
- Resume Analyzer (PDF upload via pypdf or pasted text + JD → AI ATS score 0-100, matched/missing keywords, strengths, suggestions)
- Mock Interview (role + difficulty + optional 3min/q timer → 5 AI-generated questions; per-question eval with relevance/technical/clarity scores + sample answer)
- Dashboard (KPIs: streak, avg, best, totals; line chart of scores over time; radar chart of category breakdown; recent attempts; AI tips)
- Compare two interview attempts with category-level deltas
- Daily streak tracking
- Dark/light mode toggle
- Swiss Brutalist design (Cabinet Grotesk + IBM Plex Sans/Mono)
- Sidebar navigation desktop, bottom nav mobile

## What's Implemented (2026-02 — Iteration 2)
- **Company-specific question packs**: Google, Amazon, Meta, Apple, Microsoft, Netflix. LLM prompt tailored per company profile.
- **Voice answers via Whisper STT**: mic button on every question, records via MediaRecorder, transcribes via `/api/voice/transcribe` → appends to textarea.
- **TTS sample answer playback**: 'Listen' button on every sample answer uses browser SpeechSynthesis (zero API cost).
- **Resume version history + word-level diff**: new `/resume/history` page lists past resumes, picks any two, server-side `difflib`-based diff with colored adds/removes, fixed vs new keyword gaps, ATS score delta.

## Backlog (P1/P2)
- Voice answers (speech-to-text)
- Audio playback of sample answers (TTS)
- Resume version history with diff
- Question bank export to PDF
- Team/Recruiter mode
- Email weekly progress digests
- Stripe-powered Pro tier (unlimited interviews, history >30 days)

## Next Tasks
- Add curated industry/company-specific question packs
- Rich text editor for answers (markdown / code blocks)
