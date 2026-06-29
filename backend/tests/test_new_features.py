"""Backend tests for iteration_2 NEW features: company packs, voice STT, resume diff."""
import io
import os
import struct
import wave

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "test.user@prepstack.dev"
PWD = "TestPass123"
LLM_TIMEOUT = 180


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PWD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _multipart_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- 1) Company-specific question packs ----------
class TestCompanyPack:
    def test_generate_with_company_google(self, auth_headers):
        payload = {"role": "Software Engineer", "difficulty": "medium", "num_questions": 5, "company": "Google"}
        r = requests.post(f"{API}/interview/generate", headers=auth_headers, json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("company") == "Google"
        assert 5 <= len(body["questions"]) <= 7
        # Verify content reflects Google-style: at least one question mentions scale/DSA/algorithm/system
        joined = " ".join(q["text"].lower() for q in body["questions"])
        google_signals = ["scal", "algorithm", "complexity", "system design", "data structure", "google", "big-o", "design a", "distributed"]
        assert any(sig in joined for sig in google_signals), f"No Google-style signals found. Questions: {joined}"
        TestCompanyPack.google_session = body

    def test_generate_without_company(self, auth_headers):
        payload = {"role": "Backend Engineer", "difficulty": "easy", "num_questions": 5}
        r = requests.post(f"{API}/interview/generate", headers=auth_headers, json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        # company should echo back as null
        assert body.get("company") in (None, "")
        assert 5 <= len(body["questions"]) <= 7

    def test_evaluate_persists_company(self, auth_headers):
        # Use the Google session from earlier
        sess = getattr(TestCompanyPack, "google_session", None)
        if not sess:
            pytest.skip("No google_session generated")
        answers = [{"question_id": q["id"], "answer": "I would design with scalability in mind using sharding."} for q in sess["questions"]]
        payload = {
            "session_id": sess["session_id"],
            "role": sess["role"],
            "difficulty": sess["difficulty"],
            "company": "Google",
            "questions": sess["questions"],
            "answers": answers,
            "duration_seconds": 60,
        }
        r = requests.post(f"{API}/interview/evaluate", headers=auth_headers, json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"] == sess["session_id"]
        # GET interview by id and confirm company persisted
        rg = requests.get(f"{API}/interview/{body['id']}", headers=auth_headers, timeout=30)
        assert rg.status_code == 200
        assert rg.json().get("company") == "Google"


# ---------- 2) Voice / Whisper STT ----------
def _silent_wav_bytes(seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        # silence
        w.writeframes(b"\x00\x00" * int(seconds * sample_rate))
    return buf.getvalue()


class TestVoice:
    def test_transcribe_requires_auth(self):
        r = requests.post(f"{API}/voice/transcribe", timeout=30)
        assert r.status_code == 401, r.text

    def test_transcribe_missing_file(self, token):
        r = requests.post(f"{API}/voice/transcribe", headers=_multipart_headers(token), timeout=30)
        # FastAPI returns 422 when required form file missing
        assert r.status_code in (400, 422), r.text

    def test_transcribe_with_valid_wav(self, token):
        wav = _silent_wav_bytes(1.0)
        files = {"file": ("audio.wav", wav, "audio/wav")}
        r = requests.post(f"{API}/voice/transcribe", headers=_multipart_headers(token), files=files, timeout=120)
        # Whisper may return empty text for silence; tolerate but must be 200 with text key
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        assert "text" in body and isinstance(body["text"], str)


# ---------- 3) Resume Diff ----------
@pytest.fixture(scope="module")
def two_resume_ids(token):
    """Ensure at least 2 resumes exist for the user; return two ids (newest two)."""
    h = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{API}/resume/list", headers=h, timeout=30)
    assert r.status_code == 200
    items = r.json()
    needed = max(0, 2 - len(items))
    jd = "Senior Python Engineer with FastAPI, MongoDB, Docker, Kubernetes, AWS, GraphQL, Kafka."
    resume_a = "John Doe. Python developer. 5 years building REST APIs."
    resume_b = "John Doe. Senior Python engineer with FastAPI, MongoDB, Docker, AWS, Kubernetes, GraphQL background."
    created = []
    for txt in [resume_a, resume_b][:needed]:
        data = {"resume_text": txt, "job_description": jd}
        rr = requests.post(f"{API}/resume/analyze", headers=h, data=data, timeout=LLM_TIMEOUT)
        assert rr.status_code == 200, rr.text
        created.append(rr.json()["id"])
    # refetch
    r = requests.get(f"{API}/resume/list", headers=h, timeout=30)
    items = r.json()
    assert len(items) >= 2, "Could not provision 2 resumes"
    return items[0]["id"], items[1]["id"]


class TestResumeDiff:
    def test_diff_requires_auth(self):
        r = requests.post(f"{API}/resume/diff", json={"a": "x", "b": "y"}, timeout=30)
        assert r.status_code == 401

    def test_diff_missing_ids(self, auth_headers):
        r = requests.post(f"{API}/resume/diff", headers=auth_headers, json={"a": "x"}, timeout=30)
        assert r.status_code == 400, r.text

    def test_diff_unowned(self, auth_headers, two_resume_ids):
        a, _ = two_resume_ids
        r = requests.post(f"{API}/resume/diff", headers=auth_headers, json={"a": a, "b": "bogus-non-existent-id-1234"}, timeout=30)
        assert r.status_code == 404, r.text

    def test_diff_valid(self, auth_headers, two_resume_ids):
        a, b = two_resume_ids
        r = requests.post(f"{API}/resume/diff", headers=auth_headers, json={"a": a, "b": b}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        for key in ["ats_score_diff", "fixed_keywords", "new_gaps", "operations", "similarity", "a", "b"]:
            assert key in body, f"Missing key {key}"
        assert isinstance(body["operations"], list)
        assert isinstance(body["similarity"], (int, float))
        assert isinstance(body["fixed_keywords"], list)
        assert isinstance(body["new_gaps"], list)
        # Ensure operations have proper schema
        if body["operations"]:
            op = body["operations"][0]
            assert "op" in op and op["op"] in {"equal", "replace", "insert", "delete"}
            assert "a" in op and "b" in op
