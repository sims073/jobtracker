from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from .. import auth
from ..models import users, free_username
from ..schemas import Reg, Login, PasswordChange
from ..services.rules import clean_username, username_error

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/username-available")
async def username_available(username: str = ""):
    name = clean_username(username)
    err = username_error(name)
    if err:
        return {"available": False, "reason": err}
    if await users.find_one({"username": name}, {"_id": 1}):
        return {"available": False, "reason": "This username is taken"}
    return {"available": True, "reason": ""}


@router.post("/register")
async def register(b: Reg):
    email = b.email.strip().lower()
    if not b.name.strip() or "@" not in email:
        raise HTTPException(400, "Enter your name and a valid email")
    if len(b.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await users.find_one({"email": email}):
        raise HTTPException(400, "This email is already registered")
    if b.username.strip():
        username = clean_username(b.username)
        err = username_error(username)
        if err:
            raise HTTPException(400, err)
        if await users.find_one({"username": username}, {"_id": 1}):
            raise HTTPException(400, "This username is taken")
    else:
        username = await free_username(email.split("@")[0])
    doc = {
        "name": b.name.strip(), "email": email, "username": username,
        "password_hash": auth.hash_pw(b.password),
        "role": "user", "is_active": True, "headline": "", "bio": "", "stream": "",
        "interests": [], "avatar": "", "target_role": "Backend Developer",
        "github": "", "achievements": [], "skills": [], "xp": 0, "streak": 0,
        "last_active": None, "badges": [], "public_profile": True, "show_stats": True,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        res = await users.insert_one(doc)
    except DuplicateKeyError:   # two people grabbed the same email/username at once
        raise HTTPException(400, "This email or username is already registered")
    return {"token": auth.make_token(res.inserted_id)}


@router.post("/login")
async def login(b: Login):
    user = await users.find_one({"email": b.email.strip().lower()})
    if not user or not auth.check_pw(b.password, user["password_hash"]):
        raise HTTPException(400, "Wrong email or password")
    if not user.get("is_active", True):
        raise HTTPException(403, "This account has been blocked")
    return {"token": auth.make_token(user["_id"])}


@router.post("/change-password")
async def change_password(b: PasswordChange, u=Depends(auth.current_user)):
    if not auth.check_pw(b.current_password, u["password_hash"]):
        raise HTTPException(400, "Current password is wrong")
    if len(b.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    if b.new_password == b.current_password:
        raise HTTPException(400, "New password must be different from the current one")
    await users.update_one({"_id": u["_id"]}, {"$set": {"password_hash": auth.hash_pw(b.new_password)}})
    return {"ok": True}