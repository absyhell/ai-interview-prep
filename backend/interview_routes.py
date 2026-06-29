"""Mock interview routes."""
import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from llm_service import evaluate_answers, generate_interview_questions
from models import (
    EvaluateInterviewRequest,
    GenerateInterviewRequest,
    GenerateInterviewResponse,
    InterviewQuestion,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/generate", response_model=GenerateInterviewResponse)
async def generate(req: GenerateInterviewRequest, user: dict = Depends(get_current_user)):
    if req.difficulty not in {"easy", "medium", "hard"}:
        raise HTTPException(status_code=400, detail="Invalid difficulty")
    n = max(5, min(7, req.num_questions))
    qs = await generate_interview_questions(req.role, req.difficulty, n, company=req.company)
    if not qs:
        raise HTTPException(status_code=502, detail="Could not generate questions, try again")
    return GenerateInterviewResponse(
        session_id=str(uuid.uuid4()),
        role=req.role,
        difficulty=req.difficulty,
        company=req.company,
        questions=[InterviewQuestion(**q) for q in qs],
    )


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _update_streak(db, user_id: str):
    today = _today_str()
    streak = await db.streaks.find_one({"user_id": user_id}, {"_id": 0})
    if not streak:
        await db.streaks.insert_one({
            "user_id": user_id, "current_streak": 1, "best_streak": 1,
            "last_practice_date": today,
        })
        return
    last = streak.get("last_practice_date")
    current = streak.get("current_streak", 0)
    best = streak.get("best_streak", 0)
    if last == today:
        return  # already counted today
    # Check if last was yesterday
    try:
        last_dt = datetime.strptime(last, "%Y-%m-%d").date() if last else None
        today_dt = datetime.strptime(today, "%Y-%m-%d").date()
        delta = (today_dt - last_dt).days if last_dt else None
    except Exception:
        delta = None
    if delta == 1:
        current += 1
    else:
        current = 1
    best = max(best, current)
    await db.streaks.update_one(
        {"user_id": user_id},
        {"$set": {"current_streak": current, "best_streak": best, "last_practice_date": today}},
    )


@router.post("/evaluate")
async def evaluate(req: EvaluateInterviewRequest, user: dict = Depends(get_current_user)):
    qmap = {q.id: q for q in req.questions}
    qa_pairs = []
    for a in req.answers:
        q = qmap.get(a.question_id)
        if not q:
            continue
        qa_pairs.append({
            "question_id": q.id,
            "question": q.text,
            "category": q.category,
            "answer": a.answer,
        })
    if not qa_pairs:
        raise HTTPException(status_code=400, detail="No answers to evaluate")

    evals = await evaluate_answers(req.role, req.difficulty, qa_pairs)
    eval_map = {e.get("question_id"): e for e in evals}

    evaluations = []
    cat_buckets: dict = {}
    for q in req.questions:
        a = next((x for x in req.answers if x.question_id == q.id), None)
        ev = eval_map.get(q.id, {})
        score = float(ev.get("score", 0))
        evaluations.append({
            "question_id": q.id,
            "question": q.text,
            "category": q.category,
            "user_answer": a.answer if a else "",
            "score": round(score, 2),
            "relevance": round(float(ev.get("relevance", 0)), 2),
            "technical": round(float(ev.get("technical", 0)), 2),
            "clarity": round(float(ev.get("clarity", 0)), 2),
            "feedback": str(ev.get("feedback", "")),
            "sample_answer": str(ev.get("sample_answer", "")),
        })
        cat_buckets.setdefault(q.category, []).append(score)

    overall = round(sum(e["score"] for e in evaluations) / max(1, len(evaluations)), 2)
    cat_scores = {c: round(sum(v) / len(v), 2) for c, v in cat_buckets.items()}

    session_doc = {
        "id": req.session_id or str(uuid.uuid4()),
        "user_id": user["id"],
        "role": req.role,
        "difficulty": req.difficulty,
        "company": req.company,
        "overall_score": overall,
        "category_scores": cat_scores,
        "evaluations": evaluations,
        "duration_seconds": req.duration_seconds,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    from server import db
    await db.interview_sessions.insert_one(session_doc.copy())
    await _update_streak(db, user["id"])
    return session_doc


@router.get("/list")
async def list_interviews(user: dict = Depends(get_current_user)):
    from server import db
    items = await db.interview_sessions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items


@router.get("/{interview_id}")
async def get_interview(interview_id: str, user: dict = Depends(get_current_user)):
    from server import db
    item = await db.interview_sessions.find_one(
        {"id": interview_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item


@router.post("/compare")
async def compare(payload: dict, user: dict = Depends(get_current_user)):
    a_id = payload.get("a")
    b_id = payload.get("b")
    if not a_id or not b_id:
        raise HTTPException(status_code=400, detail="Need both interview ids")
    from server import db
    a = await db.interview_sessions.find_one({"id": a_id, "user_id": user["id"]}, {"_id": 0})
    b = await db.interview_sessions.find_one({"id": b_id, "user_id": user["id"]}, {"_id": 0})
    if not a or not b:
        raise HTTPException(status_code=404, detail="Interview(s) not found")
    diff = round(b["overall_score"] - a["overall_score"], 2)
    cat_diff = {}
    cats = set(a.get("category_scores", {}).keys()) | set(b.get("category_scores", {}).keys())
    for c in cats:
        cat_diff[c] = round(
            b.get("category_scores", {}).get(c, 0) - a.get("category_scores", {}).get(c, 0), 2
        )
    return {"a": a, "b": b, "overall_diff": diff, "category_diff": cat_diff}
