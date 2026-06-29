"""Backend tests for AI Mock Interview & Resume Analyzer (PrepStack)."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://prep-dashboard-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EXISTING_EMAIL = "test.user@prepstack.dev"
EXISTING_PASSWORD = "TestPass123"
LLM_TIMEOUT = 180


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def existing_token(session):
    r = session.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASSWORD}, timeout=30)
    if r.status_code != 200:
        # Try to signup if user does not exist
        r2 = session.post(f"{API}/auth/signup", json={"name": "Test User", "email": EXISTING_EMAIL, "password": EXISTING_PASSWORD}, timeout=30)
        if r2.status_code == 200:
            return r2.json()["token"]
        pytest.skip(f"Cannot login or signup existing test user: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(existing_token):
    return {"Authorization": f"Bearer {existing_token}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_signup_new_user(self, session):
        email = f"testuser_{uuid.uuid4().hex[:8]}@prepstack.dev"
        r = session.post(f"{API}/auth/signup", json={"name": "New User", "email": email, "password": "Passw0rd!"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
        assert data["user"]["email"] == email
        assert "id" in data["user"]

    def test_signup_duplicate_email(self, session):
        r = session.post(f"{API}/auth/signup", json={"name": "Dup", "email": EXISTING_EMAIL, "password": "TestPass123"}, timeout=30)
        assert r.status_code == 400, r.text

    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASSWORD}, timeout=30)
        assert r.status_code == 200, r.text
        assert "token" in r.json()

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": "wrongpass"}, timeout=30)
        assert r.status_code == 401

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == EXISTING_EMAIL

    def test_me_without_token(self, session):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# ---------- Resume ----------
class TestResume:
    def test_analyze_with_text(self, auth_headers):
        # multipart form-data; remove content-type so requests sets boundary
        h = {k: v for k, v in auth_headers.items() if k.lower() != "content-type"}
        data = {
            "resume_text": "John Doe. Software Engineer with 5 years Python, FastAPI, MongoDB, AWS. Built REST APIs and microservices. Led a team of 4. Strong DSA skills.",
            "job_description": "Senior Python Engineer with FastAPI, MongoDB, Docker, Kubernetes, AWS. Lead engineering teams and design scalable backend systems.",
        }
        r = requests.post(f"{API}/resume/analyze", headers=h, data=data, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert 0 <= body["ats_score"] <= 100
        assert isinstance(body["matched_keywords"], list)
        assert isinstance(body["missing_keywords"], list)
        assert isinstance(body["strengths"], list)
        assert isinstance(body["suggestions"], list)
        assert isinstance(body["summary"], str)

    def test_analyze_empty_inputs(self, auth_headers):
        h = {k: v for k, v in auth_headers.items() if k.lower() != "content-type"}
        data = {"resume_text": "", "job_description": "Some JD"}
        r = requests.post(f"{API}/resume/analyze", headers=h, data=data, timeout=30)
        assert r.status_code == 400


# ---------- Interview ----------
@pytest.fixture(scope="session")
def generated_session(auth_headers):
    payload = {"role": "Software Engineer", "difficulty": "easy", "num_questions": 5}
    r = requests.post(f"{API}/interview/generate", headers=auth_headers, json=payload, timeout=LLM_TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()


class TestInterview:
    def test_generate_questions(self, generated_session):
        data = generated_session
        assert "session_id" in data
        qs = data["questions"]
        assert 5 <= len(qs) <= 7
        for q in qs:
            assert q["category"] in {"technical", "dsa", "core", "hr"}
            assert q["id"] and q["text"]

    def test_generate_invalid_difficulty(self, auth_headers):
        r = requests.post(f"{API}/interview/generate", headers=auth_headers,
                          json={"role": "SE", "difficulty": "expert", "num_questions": 5}, timeout=30)
        assert r.status_code == 400

    def test_evaluate_and_persist(self, auth_headers, generated_session):
        questions = generated_session["questions"]
        answers = [{"question_id": q["id"], "answer": "I would approach this by analyzing requirements and using best practices like SOLID principles."} for q in questions]
        payload = {
            "session_id": generated_session["session_id"],
            "role": generated_session["role"],
            "difficulty": generated_session["difficulty"],
            "questions": questions,
            "answers": answers,
            "duration_seconds": 120,
        }
        r = requests.post(f"{API}/interview/evaluate", headers=auth_headers, json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"] == generated_session["session_id"]
        assert 0 <= body["overall_score"] <= 10
        assert isinstance(body["category_scores"], dict)
        assert len(body["evaluations"]) == len(questions)
        for e in body["evaluations"]:
            assert "score" in e and "feedback" in e and "sample_answer" in e
            assert "relevance" in e and "technical" in e and "clarity" in e
        # Persist via list
        time.sleep(0.5)
        rl = requests.get(f"{API}/interview/list", headers=auth_headers, timeout=30)
        assert rl.status_code == 200
        assert any(s["id"] == body["id"] for s in rl.json())
        # GET by id
        rg = requests.get(f"{API}/interview/{body['id']}", headers=auth_headers, timeout=30)
        assert rg.status_code == 200
        assert rg.json()["id"] == body["id"]
        # store id on class for compare test
        TestInterview.last_id = body["id"]

    def test_compare_two(self, auth_headers):
        rl = requests.get(f"{API}/interview/list", headers=auth_headers, timeout=30)
        items = rl.json()
        if len(items) < 2:
            pytest.skip("Need at least 2 interviews to compare")
        a, b = items[0]["id"], items[1]["id"]
        r = requests.post(f"{API}/interview/compare", headers=auth_headers, json={"a": a, "b": b}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "overall_diff" in body and "category_diff" in body

    def test_unauthenticated(self):
        r = requests.get(f"{API}/interview/list", timeout=30)
        assert r.status_code == 401


# ---------- Dashboard ----------
class TestDashboard:
    def test_stats(self, auth_headers):
        r = requests.get(f"{API}/dashboard/stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        for k in ["total_interviews", "average_score", "best_score", "streak_days",
                  "scores_over_time", "category_breakdown", "recent_interviews", "tips"]:
            assert k in b
        assert b["streak_days"] >= 1  # after evaluate
