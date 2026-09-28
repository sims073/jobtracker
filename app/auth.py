import os, hmac, hashlib
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from bson.errors import InvalidId
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from .models import users

SECRET = os.getenv("SECRET_KEY", "change-me-before-deploying")
bearer = HTTPBearer()


def _hash(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 100_000).hex()


def hash_pw(pw):
    salt = os.urandom(16)
    return salt.hex() + ":" + _hash(pw, salt)


def check_pw(pw, stored):
    salt, h = stored.split(":")
    return hmac.compare_digest(_hash(pw, bytes.fromhex(salt)), h)


def make_token(uid):
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": str(uid), "exp": exp}, SECRET, algorithm="HS256")


async def current_user(creds=Depends(bearer)):
    try:
        uid = jwt.decode(creds.credentials, SECRET, algorithms=["HS256"])["sub"]
        oid = ObjectId(uid)
    except (jwt.PyJWTError, InvalidId, ValueError):
        raise HTTPException(401, "Session expired, please log in again")
    user = await users.find_one({"_id": oid})
    if not user:
        raise HTTPException(401, "User not found")
    if not user.get("is_active", True):
        raise HTTPException(403, "This account has been blocked")
    return user


async def require_admin(user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user
