import secrets
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from ..auth import current_user
from ..database import oid, ser
from ..models import users
from ..schemas import ProfileIn, AchievementIn, SkillIn
from ..services import scoring, rules
from ..services.gamification import touch_streak, new_badges

router = APIRouter(prefix="/api", tags=["profile"])

ME_FIELDS = ["name", "email", "username", "role", "headline", "bio", "stream", "interests", "avatar",
             "target_role", "github", "achievements", "skills", "xp", "streak", "badges",
             "public_profile", "show_stats"]
DEFAULTS = {"username": "", "bio": "", "stream": "", "interests": [], "avatar": ""}


def public_view(u, my_id=None):
    out = {k: u.get(k, DEFAULTS.get(k)) for k in [
        "name", "username", "headline", "bio", "stream", "interests", "avatar", "target_role",
        "github", "achievements", "skills", "xp", "streak", "badges", "public_profile"]}
    out["id"] = str(u["_id"])
    out["is_self"] = my_id is not None and u["_id"] == my_id
    return out


@router.get("/me")
async def me(u=Depends(current_user)):
    streak, xp_gain, today = touch_streak(u)
    update = {"streak": streak, "last_active": datetime.now(timezone.utc)}
    badges = u.get("badges", [])
    if xp_gain:
        update["xp"] = u.get("xp", 0) + xp_gain
        gained = new_badges(update["xp"], badges)
        if gained:
            update["badges"] = badges + gained
    if update:
        await users.update_one({"_id": u["_id"]}, {"$set": update})
        u.update(update)
    return {k: u.get(k, DEFAULTS.get(k)) for k in ME_FIELDS} | {"id": str(u["_id"])}


@router.put("/me")
async def update_me(b: ProfileIn, u=Depends(current_user)):
    data = {k: v for k, v in b.model_dump(exclude_unset=True).items() if v is not None}
    if "target_role" in data and data["target_role"] not in scoring.ROLE_WEIGHTS:
        raise HTTPException(400, "Invalid role")
    if "username" in data:
        name = rules.clean_username(data["username"])
        if name != u.get("username"):
            err = rules.username_error(name)
            if err:
                raise HTTPException(400, err)
            if await users.find_one({"username": name, "_id": {"$ne": u["_id"]}}, {"_id": 1}):
                raise HTTPException(400, "This username is taken")
        data["username"] = name
    if "bio" in data:
        data["bio"] = data["bio"].strip()
        if len(data["bio"]) > rules.MAX_BIO:
            raise HTTPException(400, f"Bio can be at most {rules.MAX_BIO} characters")
    if "stream" in data and data["stream"] and data["stream"] not in rules.STREAMS:
        raise HTTPException(400, "Invalid stream")
    if "interests" in data:
        data["interests"], err = rules.clean_interests(data["interests"])
        if err:
            raise HTTPException(400, err)
    try:
        await users.update_one({"_id": u["_id"]}, {"$set": data})
    except DuplicateKeyError:
        raise HTTPException(400, "This username is taken")
    return {"ok": True}


def _remove_avatar_file(url):
    """Delete an old avatar from disk (only ever inside the avatars folder)."""
    if url and url.startswith("/uploads/avatars/"):
        (rules.AVATAR_DIR / Path(url).name).unlink(missing_ok=True)


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), u=Depends(current_user)):
    data = await file.read(rules.MAX_AVATAR_BYTES + 1)
    if len(data) > rules.MAX_AVATAR_BYTES:
        raise HTTPException(400, "Image must be smaller than 2 MB")
    ext = rules.image_ext(data[:12])
    if not ext:
        raise HTTPException(400, "Only JPG, PNG or WEBP images are allowed")
    rules.AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{u['_id']}_{secrets.token_hex(4)}{ext}"
    (rules.AVATAR_DIR / name).write_bytes(data)
    _remove_avatar_file(u.get("avatar"))
    url = f"/uploads/avatars/{name}"
    await users.update_one({"_id": u["_id"]}, {"$set": {"avatar": url}})
    return {"avatar": url}


@router.delete("/me/avatar")
async def delete_avatar(u=Depends(current_user)):
    _remove_avatar_file(u.get("avatar"))
    await users.update_one({"_id": u["_id"]}, {"$set": {"avatar": ""}})
    return {"ok": True}


ACH_TYPES = ["Project", "Certificate", "Internship", "Hackathon"]


def _check_achievement(b):
    if not b.title.strip():
        raise HTTPException(400, "Title is required")
    if b.type not in ACH_TYPES:
        raise HTTPException(400, "Invalid achievement type")
    if b.link and not b.link.startswith(("http://", "https://")):
        raise HTTPException(400, "Link must start with http:// or https://")


@router.get("/achievements")
async def list_achievements(u=Depends(current_user)):
    return u.get("achievements", [])


@router.post("/achievements")
async def add_achievement(b: AchievementIn, u=Depends(current_user)):
    _check_achievement(b)
    item = b.model_dump() | {"id": str(ObjectId())}
    await users.update_one({"_id": u["_id"]}, {"$push": {"achievements": item}})
    return item


@router.put("/achievements/{aid}")
async def edit_achievement(aid: str, b: AchievementIn, u=Depends(current_user)):
    _check_achievement(b)
    r = await users.update_one({"_id": u["_id"], "achievements.id": aid}, {"$set": {
        "achievements.$.title": b.title.strip(), "achievements.$.type": b.type,
        "achievements.$.link": b.link, "achievements.$.description": b.description}})
    if r.matched_count == 0:
        raise HTTPException(404, "Achievement not found")
    return b.model_dump() | {"id": aid}


@router.delete("/achievements/{aid}")
async def del_achievement(aid: str, u=Depends(current_user)):
    await users.update_one({"_id": u["_id"]}, {"$pull": {"achievements": {"id": aid}}})
    return {"ok": True}


@router.get("/skills")
async def list_skills(u=Depends(current_user)):
    return u.get("skills", [])


@router.post("/skills")
async def add_skill(b: SkillIn, u=Depends(current_user)):
    if b.name not in scoring.ALL_SKILLS:
        raise HTTPException(400, "Unknown skill")
    skills = [s for s in u.get("skills", []) if s["name"] != b.name] + [b.model_dump()]
    await users.update_one({"_id": u["_id"]}, {"$set": {"skills": skills}})
    return {"ok": True}


@router.delete("/skills/{name}")
async def del_skill(name: str, u=Depends(current_user)):
    await users.update_one({"_id": u["_id"]}, {"$pull": {"skills": {"name": name}}})
    return {"ok": True}


@router.get("/users")
async def search_users(q: str = "", u=Depends(current_user)):
    from ..routes.network import status_between  # local import avoids a circular import
    filt = {"public_profile": True, "_id": {"$ne": u["_id"]}}
    q = q.strip().lstrip("@")
    if q:
        filt["$text"] = {"$search": q}
    out = []
    async for o in users.find(filt).limit(30):
        status, c = await status_between(u["_id"], o["_id"])
        status = "sent" if status == "pending" and c["sender_id"] == u["_id"] else \
                 "received" if status == "pending" else status
        out.append({"id": str(o["_id"]), "name": o["name"], "headline": o.get("headline", ""),
                    "target_role": o.get("target_role", ""), "status": status,
                    "username": o.get("username", ""), "avatar": o.get("avatar", ""),
                    "stream": o.get("stream", ""),
                    "conn_id": str(c["_id"]) if c else None})
    return out


@router.get("/profile/{user_id}")
async def profile(user_id: str, u=Depends(current_user)):
    o = await users.find_one({"_id": oid(user_id)})
    if not o or (o["_id"] != u["_id"] and not o.get("public_profile", True)):
        raise HTTPException(404, "Profile not found")
    from ..routes.tracker import stats  # local import avoids a circular import
    st = stats(await _apps_for(o["_id"]))
    skills = {s["name"]: s["level"] for s in o.get("skills", [])}
    from ..routes.practice import topics_done_count
    done = await topics_done_count(o["_id"], scoring.safe_role(o.get("target_role")))
    r = scoring.readiness(skills, o.get("target_role"), done, st["total"], st["response_rate"])
    out = public_view(o, u["_id"])
    out["score"] = r["score"]
    out["stats"] = {"total": st["total"], "response_rate": st["response_rate"],
                    "offers": st["funnel"]["Offer"]} if o.get("show_stats", True) else None
    if o["_id"] != u["_id"]:
        from ..routes.network import status_between
        status, c = await status_between(u["_id"], o["_id"])
        out["status"] = "sent" if status == "pending" and c["sender_id"] == u["_id"] else \
                        "received" if status == "pending" else status
        out["conn_id"] = str(c["_id"]) if c else None
    return out


async def _apps_for(user_id):
    from ..models import applications
    return [a async for a in applications.find({"user_id": user_id})]