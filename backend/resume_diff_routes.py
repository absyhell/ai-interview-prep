"""Resume diff computation."""
import difflib
import re

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user

router = APIRouter(prefix="/resume", tags=["resume-diff"])


def _tokenize(text: str):
    return re.findall(r"\S+|\n", text)


@router.post("/diff")
async def diff_resumes(payload: dict, user: dict = Depends(get_current_user)):
    a_id = payload.get("a")
    b_id = payload.get("b")
    if not a_id or not b_id:
        raise HTTPException(status_code=400, detail="Need both resume ids")
    from server import db
    a = await db.resume_analyses.find_one({"id": a_id, "user_id": user["id"]}, {"_id": 0})
    b = await db.resume_analyses.find_one({"id": b_id, "user_id": user["id"]}, {"_id": 0})
    if not a or not b:
        raise HTTPException(status_code=404, detail="Resume(s) not found")

    a_tokens = _tokenize(a.get("resume_text", ""))
    b_tokens = _tokenize(b.get("resume_text", ""))
    sm = difflib.SequenceMatcher(a=a_tokens, b=b_tokens, autojunk=False)
    operations = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        operations.append({
            "op": tag,  # equal, replace, insert, delete
            "a": a_tokens[i1:i2],
            "b": b_tokens[j1:j2],
        })

    score_diff = (b.get("ats_score", 0) or 0) - (a.get("ats_score", 0) or 0)
    a_missing = set(a.get("missing_keywords", []) or [])
    b_missing = set(b.get("missing_keywords", []) or [])
    fixed = sorted(a_missing - b_missing)
    new_gaps = sorted(b_missing - a_missing)

    return {
        "a": {
            "id": a["id"], "ats_score": a.get("ats_score"),
            "created_at": a.get("created_at"), "summary": a.get("summary"),
        },
        "b": {
            "id": b["id"], "ats_score": b.get("ats_score"),
            "created_at": b.get("created_at"), "summary": b.get("summary"),
        },
        "ats_score_diff": score_diff,
        "fixed_keywords": fixed,
        "new_gaps": new_gaps,
        "operations": operations,
        "similarity": round(sm.ratio() * 100, 1),
    }
