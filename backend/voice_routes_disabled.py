"""Voice (Whisper STT) routes."""
import io
import logging
import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from emergentintegrations.llm.openai import OpenAISpeechToText

from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
ALLOWED_EXTS = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "ogg"}
MAX_BYTES = 25 * 1024 * 1024  # 25 MB


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "webm"
    if ext not in ALLOWED_EXTS:
        # Allow webm by default since MediaRecorder typically returns it
        ext = "webm"
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio")
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Audio too large (max 25 MB)")

    try:
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        buf = io.BytesIO(raw)
        buf.name = f"audio.{ext}"  # OpenAI SDK uses filename to infer format
        response = await stt.transcribe(
            file=buf,
            model="whisper-1",
            response_format="json",
            language="en",
        )
        text = getattr(response, "text", None) or (response.get("text") if isinstance(response, dict) else "")
        return {"text": text or ""}
    except Exception as exc:  # noqa: BLE001
        logger.exception("STT failed: %s", exc)
        raise HTTPException(status_code=502, detail="Transcription failed. Try again.")
