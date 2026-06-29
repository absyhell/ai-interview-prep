"""Pydantic models for the AI Mock Interview & Resume Analyzer."""
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from pydantic import BaseModel, EmailStr, Field, ConfigDict


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


# ---------- Resume ----------
class ResumeAnalyzeRequest(BaseModel):
    job_description: str
    resume_text: Optional[str] = None  # if user pastes manually


class ResumeAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    resume_text: str
    job_description: str
    ats_score: int
    matched_keywords: List[str]
    missing_keywords: List[str]
    suggestions: List[str]
    strengths: List[str]
    summary: str
    created_at: str = Field(default_factory=_now_iso)


# ---------- Interview ----------
class GenerateInterviewRequest(BaseModel):
    role: str
    difficulty: str  # easy | medium | hard
    num_questions: int = 5
    company: Optional[str] = None  # Google, Amazon, Meta, Apple, Microsoft, Netflix


class InterviewQuestion(BaseModel):
    id: str
    text: str
    category: str  # technical | hr | dsa | core
    difficulty: str


class GenerateInterviewResponse(BaseModel):
    session_id: str
    role: str
    difficulty: str
    company: Optional[str] = None
    questions: List[InterviewQuestion]


class AnswerSubmission(BaseModel):
    question_id: str
    answer: str


class EvaluateInterviewRequest(BaseModel):
    session_id: str
    role: str
    difficulty: str
    company: Optional[str] = None
    questions: List[InterviewQuestion]
    answers: List[AnswerSubmission]
    duration_seconds: Optional[int] = None


class QuestionEvaluation(BaseModel):
    question_id: str
    question: str
    category: str
    user_answer: str
    score: float  # 0-10
    relevance: float
    technical: float
    clarity: float
    feedback: str
    sample_answer: str


class InterviewSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    role: str
    difficulty: str
    overall_score: float
    category_scores: dict
    evaluations: List[QuestionEvaluation]
    duration_seconds: Optional[int] = None
    created_at: str = Field(default_factory=_now_iso)


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    total_interviews: int
    total_resumes: int
    average_score: float
    best_score: float
    streak_days: int
    last_practice_date: Optional[str]
    scores_over_time: List[dict]  # [{date, score, role}]
    category_breakdown: List[dict]  # [{category, average_score}]
    recent_interviews: List[dict]
    tips: List[str]
