from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..models import applications
from ..schemas import MatchIn
from ..services import scoring
from .tracker import stats
from .practice import topics_done_count

router = APIRouter(prefix="/api/analyzer", tags=["analyzer"])


@router.get("")
async def analyzer(role: str = "", u=Depends(current_user)):
    role = scoring.safe_role(role or u.get("target_role"))
    apps = [a async for a in applications.find({"user_id": u["_id"]})]
    st = stats(apps)
    skills = {s["name"]: s["level"] for s in u.get("skills", [])}
    done = await topics_done_count(u["_id"], role)
    r = scoring.readiness(skills, role, done, st["total"], st["response_rate"])
    return {"role": role, "stats": st, "readiness": r, "roadmap_topics_done": done}


@router.post("/match")
async def match(b: MatchIn, u=Depends(current_user)):
    need = scoring.find_skills(b.jd)
    if not need:
        raise HTTPException(400, "No IT skills found in this job description")
    have = {s["name"] for s in u.get("skills", [])} | set(scoring.find_skills(b.resume))
    ok = [s for s in need if s in have]
    return {"percent": round(100 * len(ok) / len(need)), "matched": ok, "missing": [s for s in need if s not in have]}
