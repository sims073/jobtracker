from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from ..auth import require_admin
from ..database import oid, ser
from ..models import users, companies, roadmaps, questions, applications, announcements
from ..schemas import CompanyIn, RoadmapIn, QuestionIn, AnnouncementIn, RoleUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats")
async def stats():
    total_users = await users.count_documents({})
    active_users = await users.count_documents({"is_active": True})
    total_apps = await applications.count_documents({})
    funnel_cursor = applications.aggregate([{"$group": {"_id": "$stage", "count": {"$sum": 1}}}])
    funnel = {row["_id"]: row["count"] async for row in funnel_cursor}
    role_cursor = users.aggregate([{"$group": {"_id": "$target_role", "count": {"$sum": 1}}}])
    by_role = {row["_id"]: row["count"] async for row in role_cursor}
    return {"total_users": total_users, "active_users": active_users, "total_applications": total_apps,
            "applications_by_stage": funnel, "users_by_role": by_role,
            "companies": await companies.count_documents({}), "questions": await questions.count_documents({})}


@router.get("/users")
async def list_users(q: str = ""):
    filt = {"$text": {"$search": q}} if q.strip() else {}
    rows = [u async for u in users.find(filt).sort("_id", -1).limit(100)]
    return [{"id": str(u["_id"]), "name": u["name"], "email": u["email"], "role": u["role"],
             "is_active": u.get("is_active", True), "xp": u.get("xp", 0)} for u in rows]


@router.put("/users/{uid}")
async def set_user_active(uid: str, b: RoleUpdate):
    if b.is_active is None:
        raise HTTPException(400, "Nothing to update")
    r = await users.update_one({"_id": oid(uid)}, {"$set": {"is_active": b.is_active}})
    if r.matched_count == 0:
        raise HTTPException(404, "User not found")
    return {"ok": True}


# ---------- companies ----------
@router.get("/companies")
async def admin_companies():
    return [ser(c) async for c in companies.find().sort("name", 1)]


@router.post("/companies")
async def add_company(b: CompanyIn):
    if await companies.find_one({"name": b.name}):
        raise HTTPException(400, "A company with this name already exists")
    doc = b.model_dump()
    res = await companies.insert_one(doc)
    doc["_id"] = res.inserted_id
    return ser(doc)


@router.put("/companies/{cid}")
async def update_company(cid: str, b: CompanyIn):
    r = await companies.update_one({"_id": oid(cid)}, {"$set": b.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Company not found")
    return {"ok": True}


@router.delete("/companies/{cid}")
async def del_company(cid: str):
    await companies.delete_one({"_id": oid(cid)})
    return {"ok": True}


# ---------- roadmaps ----------
@router.get("/roadmaps")
async def admin_roadmaps():
    return [ser(r) async for r in roadmaps.find()]


@router.put("/roadmaps/{role}")
async def upsert_roadmap(role: str, b: RoadmapIn):
    await roadmaps.update_one({"role": role}, {"$set": {"role": role, "topics": [t.model_dump() for t in b.topics]}},
                               upsert=True)
    return {"ok": True}


# ---------- questions ----------
@router.get("/questions")
async def admin_questions():
    return [ser(q) async for q in questions.find()]


@router.post("/questions")
async def add_question(b: QuestionIn):
    if b.answer < 0 or b.answer >= len(b.options):
        raise HTTPException(400, "Answer index is out of range for the given options")
    res = await questions.insert_one(b.model_dump())
    return {"id": str(res.inserted_id)}


@router.delete("/questions/{qid}")
async def del_question(qid: str):
    await questions.delete_one({"_id": oid(qid)})
    return {"ok": True}


# ---------- announcements ----------
@router.get("/announcements")
async def list_announcements():
    return [ser(a) async for a in announcements.find().sort("_id", -1)]


@router.post("/announcements")
async def add_announcement(b: AnnouncementIn):
    doc = b.model_dump() | {"created_at": datetime.now(timezone.utc)}
    res = await announcements.insert_one(doc)
    doc["_id"] = res.inserted_id
    return ser(doc)


@router.delete("/announcements/{aid}")
async def del_announcement(aid: str):
    await announcements.delete_one({"_id": oid(aid)})
    return {"ok": True}
