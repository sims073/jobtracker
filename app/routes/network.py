from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..database import oid, ser
from ..models import connections, users, db
from ..schemas import Respond, MessageIn

router = APIRouter(prefix="/api/connections", tags=["network"])
messages = db["messages"]  # {from_id, to_id, text, at}


async def status_between(a, b):
    c = await connections.find_one({"$or": [
        {"sender_id": a, "receiver_id": b}, {"sender_id": b, "receiver_id": a}]})
    if not c:
        return "none", None
    return ("connected" if c["status"] == "accepted" else "pending"), c


@router.get("")
async def my_connections(u=Depends(current_user)):
    rows = [c async for c in connections.find({"$or": [{"sender_id": u["_id"]}, {"receiver_id": u["_id"]}]})]
    friends, incoming, sent = [], [], []
    for c in rows:
        other_id = c["receiver_id"] if c["sender_id"] == u["_id"] else c["sender_id"]
        o = await users.find_one({"_id": other_id})
        if not o:
            continue
        item = {"conn_id": str(c["_id"]), "id": str(o["_id"]), "name": o["name"],
                "headline": o.get("headline", ""), "target_role": o.get("target_role", "")}
        if c["status"] == "accepted":
            friends.append(item)
        elif c["receiver_id"] == u["_id"]:
            incoming.append(item)
        else:
            sent.append(item)
    return {"friends": friends, "incoming": incoming, "sent": sent}


@router.post("/{user_id}")
async def send_request(user_id: str, u=Depends(current_user)):
    other = await users.find_one({"_id": oid(user_id)})
    if not other or other["_id"] == u["_id"] or not other.get("public_profile", True):
        raise HTTPException(404, "User not found")
    if (await status_between(u["_id"], other["_id"]))[0] != "none":
        raise HTTPException(400, "Already connected or request pending")
    await connections.insert_one({"sender_id": u["_id"], "receiver_id": other["_id"], "status": "pending"})
    return {"ok": True}


@router.post("/{cid}/respond")
async def respond(cid: str, b: Respond, u=Depends(current_user)):
    c = await connections.find_one({"_id": oid(cid)})
    if not c or c["receiver_id"] != u["_id"] or c["status"] != "pending":
        raise HTTPException(404, "Request not found")
    if b.accept:
        await connections.update_one({"_id": c["_id"]}, {"$set": {"status": "accepted"}})
    else:
        await connections.delete_one({"_id": c["_id"]})
    return {"ok": True}


@router.get("/{user_id}/messages")
async def get_messages(user_id: str, u=Depends(current_user)):
    other = oid(user_id)
    if (await status_between(u["_id"], other))[0] != "connected":
        raise HTTPException(403, "You are not connected with this user")
    rows = [m async for m in messages.find({"$or": [
        {"from_id": u["_id"], "to_id": other}, {"from_id": other, "to_id": u["_id"]}]}).sort("at", 1)]
    return [{"from_id": str(m["from_id"]), "text": m["text"], "at": m["at"].isoformat()} for m in rows]


@router.post("/{user_id}/messages")
async def send_message(user_id: str, b: MessageIn, u=Depends(current_user)):
    other = oid(user_id)
    if (await status_between(u["_id"], other))[0] != "connected":
        raise HTTPException(403, "You are not connected with this user")
    if not b.text.strip():
        raise HTTPException(400, "Message cannot be empty")
    await messages.insert_one({"from_id": u["_id"], "to_id": other, "text": b.text.strip()[:2000],
                                "at": datetime.now(timezone.utc)})
    return {"ok": True}
