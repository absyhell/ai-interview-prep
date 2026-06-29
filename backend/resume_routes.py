"""Resume analyzer routes."""
import io
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pypdf import PdfReader

from auth import get_current_user
from llm_service import analyze_resume
from models import ResumeAnalysis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["resume"])


def _extract_pdf_text(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        parts = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(parts).strip()
    except Exception as exc:
        logger.exception("PDF parse failed: %s", exc)
        return ""


def get_db(request):
    return request.app.state.db


@router.post("/analyze")
async def analyze(
    job_description: str = Form(...),
    resume_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user),
):
    text = (resume_text or "").strip()
    if not text and file is not None:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        text = _extract_pdf_text(raw)
    if not text:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from resume. Upload a PDF or paste resume text.",
        )
    if not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required")

    result = await analyze_resume(text, job_description)
    analysis = ResumeAnalysis(
        user_id=user["id"],
        resume_text=text[:20000],
        job_description=job_description[:8000],
        **result,
    )
    doc = analysis.model_dump()
    # Lazy import to avoid circular
    from server import db
    await db.resume_analyses.insert_one(doc.copy())
    return analysis


@router.get("/list")
async def list_analyses(user: dict = Depends(get_current_user)):
    from server import db
    items = await db.resume_analyses.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return items


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    from server import db
    item = await db.resume_analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item
