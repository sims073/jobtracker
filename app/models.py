"""
MongoDB has no fixed tables, so this file plays the role models.py used to play
with SQLAlchemy: it names every collection and sets up the indexes each one needs.
Document *shape* (what fields a document has) is documented here in comments and
enforced on the way in by the Pydantic classes in schemas.py.
"""
import re
from .database import db

users = db["users"]              # {name, email, username (unique), password_hash, role: user/admin,
                                  #  headline, bio, stream, interests[], avatar (url),
                                  #  target_role, github, achievements[],
                                  #  skills[ {name, level} ], xp, streak, last_active,
                                  #  badges[], public_profile, show_stats}
companies = db["companies"]      # {name, type: Service-based/Product-based/Startup,
                                  #  about, requirements[], stages[ {name, what_tested, tips} ]}
roadmaps = db["roadmaps"]        # {role, topics[ {id, title, resources[]} ]}
progress = db["progress"]        # {user_id, role, completed_topic_ids[]}
questions = db["questions"]      # {category, difficulty, prompt, options[], answer, explanation}
attempts = db["attempts"]        # {user_id, question_id, correct, at}
applications = db["applications"]  # {user_id, company, role, company_type, stage,
                                    #  job_url, notes, follow_up, contact, applied_on}
connections = db["connections"]  # {sender_id, receiver_id, status: pending/accepted}
announcements = db["announcements"]  # {title, body, created_at}


async def free_username(base):
    """Turn any text into a valid username that no one has taken yet."""
    base = re.sub(r"[^a-z0-9_]", "", (base or "").lower())[:16]
    if len(base) < 3:
        base = (base + "user")[:16]
    name, n = base, 1
    while await users.find_one({"username": name}, {"_id": 1}):
        n += 1
        name = f"{base}{n}"
    return name


async def _reset_text_index():
    """MongoDB allows one text index per collection, so an old one with different
    fields has to be dropped before the new one can be created."""
    cur = await users.list_indexes()
    rows = [ix async for ix in cur]
    if any(ix["name"] == "users_search" for ix in rows):
        return
    for ix in rows:
        if "weights" in ix:
            await users.drop_index(ix["name"])
    await users.create_index(
        [("name", "text"), ("username", "text"), ("headline", "text"),
         ("target_role", "text"), ("stream", "text"), ("interests", "text")],
        name="users_search")


async def backfill_usernames():
    """Give every existing account (created before usernames existed) a username."""
    async for u in users.find({"username": {"$not": {"$type": "string"}}}, {"email": 1, "name": 1}):
        name = await free_username((u.get("email") or u.get("name") or "user").split("@")[0])
        await users.update_one({"_id": u["_id"]}, {"$set": {"username": name}})


async def ensure_indexes():
    await users.create_index("email", unique=True)
    await _reset_text_index()
    await users.create_index("username", unique=True,
                             partialFilterExpression={"username": {"$type": "string"}})
    await backfill_usernames()
    await companies.create_index("name", unique=True)
    await roadmaps.create_index("role", unique=True)
    await applications.create_index("user_id")
    await connections.create_index([("sender_id", 1), ("receiver_id", 1)])
    await attempts.create_index("user_id")