from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..database import oid, ser
from ..models import applications
from ..schemas import AppIn
from ..services.scoring import STAGES, COMPANY_TYPES

router = APIRouter(prefix="/api/applications", tags=["tracker"])


def stats(apps):
    total = len(apps)
    responded = sum(a["stage"] != "Applied" for a in apps)
    by_type = {}
    for t in COMPANY_TYPES:
        g = [a for a in apps if a.get("company_type") == t]
        by_type[t] = {"applied": len(g), "responded": sum(a["stage"] != "Applied" for a in g)}
    return {"total": total, "response_rate": round(100 * responded / total) if total else 0,
            "funnel": {s: sum(a["stage"] == s for a in apps) for s in STAGES}, "by_type": by_type}


def check(b):
    if not b.company.strip():
        raise HTTPException(400, "Company name is required")
    if b.stage not in STAGES:
        raise HTTPException(400, "Invalid stage")


@router.get("")
async def list_apps(u=Depends(current_user)):
    rows = [a async for a in applications.find({"user_id": u["_id"]}).sort("_id", -1)]
    return [ser(a) for a in rows]


@router.post("")
async def add_app(b: AppIn, u=Depends(current_user)):
    check(b)
    doc = b.model_dump() | {"user_id": u["_id"], "applied_on": datetime.now().strftime("%Y-%m-%d")}
    res = await applications.insert_one(doc)
    doc["_id"] = res.inserted_id
    return ser(doc)


@router.put("/{aid}")
async def update_app(aid: str, b: AppIn, u=Depends(current_user)):
    check(b)
    r = await applications.update_one({"_id": oid(aid), "user_id": u["_id"]}, {"$set": b.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Application not found")
    return ser(await applications.find_one({"_id": oid(aid)}))


@router.delete("/{aid}")
async def del_app(aid: str, u=Depends(current_user)):
    r = await applications.delete_one({"_id": oid(aid), "user_id": u["_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Application not found")
    return {"ok": True}
