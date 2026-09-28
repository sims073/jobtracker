from fastapi import APIRouter, Depends
from ..auth import current_user
from ..database import ser
from ..models import companies, roadmaps, announcements
from ..services import scoring

router = APIRouter(prefix="/api/guide", tags=["guide"])


@router.get("/announcements")
async def list_announcements(u=Depends(current_user)):
    return [ser(a) async for a in announcements.find().sort("_id", -1).limit(10)]


@router.get("/meta")
async def meta():
    return {"stages": scoring.STAGES, "roles": list(scoring.ROLE_WEIGHTS),
            "company_types": scoring.COMPANY_TYPES, "skills": scoring.SKILLS}


@router.get("/companies")
async def list_companies(type: str = "", u=Depends(current_user)):
    filt = {"type": type} if type else {}
    return [ser(c) async for c in companies.find(filt).sort("name", 1)]


@router.get("/companies/{cid}")
async def get_company(cid: str, u=Depends(current_user)):
    from ..database import oid
    from fastapi import HTTPException
    c = await companies.find_one({"_id": oid(cid)})
    if not c:
        raise HTTPException(404, "Company not found")
    return ser(c)


@router.get("/roadmap/{role}")
async def get_roadmap(role: str, u=Depends(current_user)):
    r = await roadmaps.find_one({"role": role})
    return ser(r) if r else {"role": role, "topics": []}
