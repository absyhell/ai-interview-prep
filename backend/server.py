"""AI Mock Interview & Resume Analyzer - main FastAPI app."""
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from auth import create_access_token, get_current_user, hash_password, verify_password  # noqa: E402
from models import AuthResponse, LoginRequest, SignupRequest, UserPublic  # noqa: E402

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="AI Mock Interview & Resume Analyzer")
app.state.db = db

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"status": "ok", "service": "ai-mock-interview"}


# ---------- Auth ----------
@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "id": str(uuid.uuid4()),
        "name": req.name.strip(),
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc.copy())
    token = create_access_token(user_doc["id"], user_doc["email"])
    return AuthResponse(
        token=token,
        user=UserPublic(
            id=user_doc["id"], name=user_doc["name"],
            email=user_doc["email"], created_at=user_doc["created_at"],
        ),
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return AuthResponse(
        token=token,
        user=UserPublic(
            id=user["id"], name=user["name"],
            email=user["email"], created_at=user["created_at"],
        ),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(current: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic(**user)


# Sub-routers
from resume_routes import router as resume_router  # noqa: E402
from resume_diff_routes import router as resume_diff_router  # noqa: E402
from interview_routes import router as interview_router  # noqa: E402
from dashboard_routes import router as dashboard_router  # noqa: E402
# from voice_routes import router as voice_router  # noqa: E402

api_router.include_router(resume_router)
api_router.include_router(resume_diff_router)
api_router.include_router(interview_router)
api_router.include_router(dashboard_router)
# api_router.include_router(voice_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
