
import json
import logging
import os
import re
import uuid
from typing import Optional


from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]

MODEL = "openrouter/free"
client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://your-project.onrender.com",
        "X-Title": "AI Mock Interview & Resume Analyzer",
    },
)
def _extract_json(text: str) -> Optional[dict]:
    """Robustly pull a JSON object out of an LLM response."""
    if not text:
        return None
    # Strip markdown fences
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Fallback: grab first {...} block
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None




async def _chat(system: str, user: str, session_id: Optional[str] = None) -> str:
    try:
        completion = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.7,
            max_tokens=1000
        )

        return completion.choices[0].message.content or ""

    except Exception as e:
        logger.exception("OpenRouter request failed: %s", e)
        raise

# ---------- Resume Analysis ----------
async def analyze_resume(resume_text: str, job_description: str) -> dict:
    system = (
        "You are an expert ATS (Applicant Tracking System) and senior technical recruiter. "
        "Analyze the candidate's resume against the provided job description. "
        "Return STRICT JSON with no extra commentary."
    )
    user = f"""
RESUME:
\"\"\"
{resume_text[:8000]}
\"\"\"

JOB DESCRIPTION:
\"\"\"
{job_description[:4000]}
\"\"\"

Return JSON with this exact schema:
{{
  "ats_score": <integer 0-100>,
  "matched_keywords": [<10-20 keywords from JD found in resume>],
  "missing_keywords": [<8-15 important JD keywords absent from resume>],
  "strengths": [<3-5 short bullet strings>],
  "suggestions": [<5-8 actionable improvements as short strings>],
  "summary": "<2-3 sentence overall verdict>"
}}
""".strip()
    raw = await _chat(system, user)
    data = _extract_json(raw) or {}
    # Defensive defaults
    return {
        "ats_score": int(max(0, min(100, data.get("ats_score", 0)))),
        "matched_keywords": list(data.get("matched_keywords", []))[:25],
        "missing_keywords": list(data.get("missing_keywords", []))[:20],
        "strengths": list(data.get("strengths", []))[:6],
        "suggestions": list(data.get("suggestions", []))[:10],
        "summary": str(data.get("summary", "")),
    }


# ---------- Interview Question Generation ----------
COMPANY_PROFILES = {
    "Google": "Google emphasizes algorithmic depth, Big-Tech-style coding (DSA), system design at scale, and 'Googleyness' (collaboration, intellectual humility, navigating ambiguity).",
    "Amazon": "Amazon centers questions on the 16 Leadership Principles (Customer Obsession, Ownership, Bias for Action, Dive Deep, Frugality, Earn Trust, etc.). STAR-format behavioral questions are required. Technical bar: practical coding + system design.",
    "Meta": "Meta (Facebook) focuses on coding speed, product sense (especially for cross-functional roles), behavioral 'Move Fast' culture fit, and execution under ambiguity. Strong DSA and metric-driven product questions.",
    "Apple": "Apple values craftsmanship, attention to detail, ownership of the user experience, and deep technical fundamentals (OS, performance, design quality).",
    "Microsoft": "Microsoft asks growth-mindset behavioral questions, collaborative engineering scenarios, and balanced coding/system design with an emphasis on customer impact.",
    "Netflix": "Netflix values context-over-control culture, high judgment, and senior-level autonomy. Behavioral questions focus on freedom-and-responsibility scenarios; technical bar is high but pragmatic.",
}


async def generate_interview_questions(
    role: str, difficulty: str, num_questions: int = 5, company: Optional[str] = None
) -> list:
    company_block = ""
    if company and company in COMPANY_PROFILES:
        company_block = (
            f"\nTAILOR THE QUESTIONS FOR {company.upper()} STYLE.\n"
            f"Company profile: {COMPANY_PROFILES[company]}\n"
            f"At least 2 of {num_questions} questions should reflect this company's hallmark style "
            f"(e.g., Amazon LP behavioral, Google scale/DSA, Meta product sense, etc.)."
        )

    system = (
        "You are a top-tier technical interviewer who designs balanced mock interviews. "
        "Always return STRICT JSON only."
    )
    user = f"""
Generate {num_questions} interview questions for a "{role}" role at "{difficulty}" difficulty.
Mix categories: technical, dsa, core, hr. Mark each question's category accurately.
{company_block}

Return JSON:
{{
  "questions": [
    {{"text": "<question>", "category": "technical|dsa|core|hr", "difficulty": "{difficulty}"}}
  ]
}}
""".strip()
    raw = await _chat(system, user)
    data = _extract_json(raw) or {}
    questions = data.get("questions", [])
    result = []
    for q in questions[:num_questions]:
        cat = str(q.get("category", "technical")).lower()
        if cat not in {"technical", "dsa", "core", "hr"}:
            cat = "technical"
        result.append({
            "id": str(uuid.uuid4()),
            "text": str(q.get("text", "")).strip(),
            "category": cat,
            "difficulty": difficulty,
        })
    return result


# ---------- Answer Evaluation ----------
async def evaluate_answers(role: str, difficulty: str, qa_pairs: list) -> list:
    """qa_pairs: [{question_id, question, category, answer}, ...] -> evaluations list"""
    system = (
        "You are a strict but fair senior interviewer. Evaluate each answer on relevance, "
        "technical correctness, and communication clarity. Return STRICT JSON only."
    )
    pairs_json = json.dumps(qa_pairs, ensure_ascii=False)
    user = f"""
Role: {role}
Difficulty: {difficulty}

Q&A pairs (JSON):
{pairs_json}

For EACH pair, evaluate. Return JSON:
{{
  "evaluations": [
    {{
      "question_id": "<id>",
      "score": <0-10 float>,
      "relevance": <0-10>,
      "technical": <0-10>,
      "clarity": <0-10>,
      "feedback": "<2-3 sentence specific feedback>",
      "sample_answer": "<a strong improved answer, 3-6 sentences>"
    }}
  ]
}}
If an answer is empty or off-topic, score it low and explain why.
""".strip()
    raw = await _chat(system, user)
    data = _extract_json(raw) or {}
    return data.get("evaluations", [])
