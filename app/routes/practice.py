import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..database import oid, ser
from ..models import questions, attempts, progress, users
from ..schemas import AttemptIn, TopicDone
from ..services.gamification import new_badges

router = APIRouter(prefix="/api/practice", tags=["practice"])


async def topics_done_count(user_id, role):
    p = await progress.find_one({"user_id": user_id, "role": role})
    return len(p["completed_topic_ids"]) if p else 0


@router.get("/questions")
async def list_questions(category: str = "", limit: int = 10, u=Depends(current_user)):
    filt = {"category": category} if category else {}
    rows = [q async for q in questions.find(filt)]
    random.shuffle(rows)
    return [ser(q) | {"answer": None} for q in rows[:limit]]  # hide the answer until attempted


@router.post("/attempt")
async def attempt(b: AttemptIn, u=Depends(current_user)):
    q = await questions.find_one({"_id": oid(b.question_id)})
    if not q:
        raise HTTPException(404, "Question not found")
    correct = b.selected == q["answer"]
    await attempts.insert_one({"user_id": u["_id"], "question_id": q["_id"], "correct": correct,
                                "at": datetime.now(timezone.utc)})
    xp_gain = 0
    if correct:
        xp_gain = 10
        new_xp = u.get("xp", 0) + xp_gain
        gained = new_badges(new_xp, u.get("badges", []))
        update = {"xp": new_xp}
        if gained:
            update["badges"] = u.get("badges", []) + gained
        await users.update_one({"_id": u["_id"]}, {"$set": update})
    return {"correct": correct, "answer": q["answer"], "explanation": q.get("explanation", ""), "xp_gained": xp_gain}


@router.get("/progress/{role}")
async def get_progress(role: str, u=Depends(current_user)):
    p = await progress.find_one({"user_id": u["_id"], "role": role})
    return {"role": role, "completed_topic_ids": p["completed_topic_ids"] if p else []}


@router.post("/progress/{role}")
async def set_progress(role: str, b: TopicDone, u=Depends(current_user)):
    op = "$addToSet" if b.done else "$pull"
    await progress.update_one({"user_id": u["_id"], "role": role}, {op: {"completed_topic_ids": b.topic_id}},
                               upsert=True)
    xp_gain = 3 if b.done else 0
    if xp_gain:
        await users.update_one({"_id": u["_id"]}, {"$inc": {"xp": xp_gain}})
    return {"ok": True, "xp_gained": xp_gain}
