"""
Run once to fill MongoDB with starter content:
    python -m seed.seed
Safe to re-run: companies/roadmaps are upserted, and the admin account is only
created if it doesn't already exist.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import client
from app.models import companies, roadmaps, questions, users, ensure_indexes
from app import auth

DATA = Path(__file__).parent / "data"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@devtrack.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


async def main():
    await ensure_indexes()

    company_rows = json.loads((DATA / "companies.json").read_text())
    for c in company_rows:
        await companies.update_one({"name": c["name"]}, {"$set": c}, upsert=True)
    print(f"Companies: {len(company_rows)} upserted")

    roadmap_rows = json.loads((DATA / "roadmaps.json").read_text())
    for r in roadmap_rows:
        await roadmaps.update_one({"role": r["role"]}, {"$set": r}, upsert=True)
    print(f"Roadmaps: {len(roadmap_rows)} upserted")

    if await questions.count_documents({}) == 0:
        question_rows = json.loads((DATA / "questions.json").read_text())
        await questions.insert_many(question_rows)
        print(f"Questions: {len(question_rows)} inserted")
    else:
        print("Questions already present, skipped")

    if not await users.find_one({"email": ADMIN_EMAIL}):
        await users.insert_one({
            "name": "Admin", "email": ADMIN_EMAIL, "password_hash": auth.hash_pw(ADMIN_PASSWORD),
            "role": "admin", "is_active": True, "headline": "", "target_role": "Software Engineer",
            "github": "", "achievements": [], "skills": [], "xp": 0, "streak": 0, "last_active": None,
            "badges": [], "public_profile": False, "show_stats": False,
        })
        print(f"Admin account created: {ADMIN_EMAIL} / {ADMIN_PASSWORD} (change this password later)")
    else:
        print("Admin account already exists, skipped")

    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
