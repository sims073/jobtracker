from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from .. import auth
from ..models import users
from ..schemas import Reg, Login

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(b: Reg):
    email = b.email.strip().lower()
    if not b.name.strip() or "@" not in email:
        raise HTTPException(400, "Enter your name and a valid email")
    if len(b.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await users.find_one({"email": email}):
        raise HTTPException(400, "This email is already registered")
    doc = {
        "name": b.name.strip(), "email": email, "password_hash": auth.hash_pw(b.password),
        "role": "user", "is_active": True, "headline": "", "target_role": "Backend Developer",
        "github": "", "achievements": [], "skills": [], "xp": 0, "streak": 0,
        "last_active": None, "badges": [], "public_profile": True, "show_stats": True,
        "created_at": datetime.now(timezone.utc),
    }
    res = await users.insert_one(doc)
    return {"token": auth.make_token(res.inserted_id)}


@router.post("/login")
async def login(b: Login):
    user = await users.find_one({"email": b.email.strip().lower()})
    if not user or not auth.check_pw(b.password, user["password_hash"]):
        raise HTTPException(400, "Wrong email or password")
    if not user.get("is_active", True):
        raise HTTPException(403, "This account has been blocked")
    return {"token": auth.make_token(user["_id"])}
