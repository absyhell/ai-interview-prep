"""Dashboard stats route."""
from fastapi import APIRouter, Depends

from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    from server import db
    sessions = await db.interview_sessions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    resumes = await db.resume_analyses.count_documents({"user_id": user["id"]})
    streak = await db.streaks.find_one({"user_id": user["id"]}, {"_id": 0}) or {}

    total = len(sessions)
    scores = [s.get("overall_score", 0) for s in sessions]
    avg = round(sum(scores) / total, 2) if total else 0.0
    best = round(max(scores), 2) if scores else 0.0

    scores_over_time = [
        {
            "date": s["created_at"][:10],
            "score": s.get("overall_score", 0),
            "role": s.get("role", ""),
            "id": s.get("id"),
        }
        for s in sessions
    ]

    cat_acc: dict = {}
    for s in sessions:
        for c, v in (s.get("category_scores") or {}).items():
            cat_acc.setdefault(c, []).append(v)
    category_breakdown = [
        {"category": c, "average_score": round(sum(v) / len(v), 2)}
        for c, v in cat_acc.items()
    ]

    recent = []
    for s in sessions[-5:][::-1]:
        recent.append({
            "id": s.get("id"),
            "role": s.get("role"),
            "difficulty": s.get("difficulty"),
            "overall_score": s.get("overall_score"),
            "created_at": s.get("created_at"),
        })

    # Tip generation based on weak category
    tips = []
    if category_breakdown:
        weakest = min(category_breakdown, key=lambda x: x["average_score"])
        if weakest["average_score"] < 7:
            tips.append(f"Focus on {weakest['category'].upper()} — your average is {weakest['average_score']}/10.")
    if total == 0:
        tips.append("Start with a Medium difficulty mock interview to establish your baseline.")
    if streak.get("current_streak", 0) == 0:
        tips.append("Practice today to start a daily streak — consistency beats intensity.")
    if avg and avg < 6:
        tips.append("Use the sample answers to study high-quality response structure (STAR method).")
    if avg and avg >= 8:
        tips.append("Try harder difficulty or new roles to keep growing.")

    return {
        "total_interviews": total,
        "total_resumes": resumes,
        "average_score": avg,
        "best_score": best,
        "streak_days": streak.get("current_streak", 0),
        "best_streak": streak.get("best_streak", 0),
        "last_practice_date": streak.get("last_practice_date"),
        "scores_over_time": scores_over_time,
        "category_breakdown": category_breakdown,
        "recent_interviews": recent,
        "tips": tips[:4],
    }
