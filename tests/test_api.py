"""
These tests need a real MongoDB instance to talk to (local or Atlas) — MongoDB
has no in-memory/sqlite-style fallback the way SQL projects do.

    MONGO_URL=mongodb://localhost:27017 DB_NAME=devtrack_test pytest

Each test registers its own throwaway user (unique email), so tests don't
interfere with each other and nothing needs to be cleared beforehand. Feel
free to drop the devtrack_test database afterwards.
"""
import os
os.environ.setdefault("DB_NAME", "devtrack_test")

from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def signup():
    email = f"{uuid4().hex[:10]}@test.com"
    r = client.post("/api/auth/register", json={"name": "Test User", "email": email, "password": "secret123"})
    assert r.status_code == 200, r.text
    return email, {"Authorization": "Bearer " + r.json()["token"]}


def test_meta_has_no_auth_requirement():
    r = client.get("/api/guide/meta")
    assert r.status_code == 200
    assert "Backend Developer" in r.json()["roles"]


def test_register_and_login():
    email, h = signup()
    assert client.post("/api/auth/login", json={"email": email, "password": "secret123"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "wrong"}).status_code == 400
    assert client.post("/api/auth/register", json={"name": "x", "email": email, "password": "secret123"}).status_code == 400
    assert client.get("/api/me").status_code in (401, 403)
    assert client.get("/api/me", headers=h).json()["email"] == email


def test_skills_and_analyzer():
    _, h = signup()
    assert client.post("/api/skills", json={"name": "Not A Skill", "level": 1}, headers=h).status_code == 400
    assert client.post("/api/skills", json={"name": "Python", "level": 3}, headers=h).status_code == 200
    assert any(s["name"] == "Python" for s in client.get("/api/skills", headers=h).json())
    r = client.get("/api/analyzer?role=Backend Developer", headers=h).json()
    assert 0 <= r["readiness"]["score"] <= 100
    m = client.post("/api/analyzer/match", json={"jd": "We need Python, SQL and Docker experience"}, headers=h).json()
    assert m["matched"] == ["Python"] and set(m["missing"]) == {"SQL", "Docker"}


def test_achievements():
    _, h = signup()
    a = client.post("/api/achievements", json={"title": "Hackathon winner", "type": "Hackathon"}, headers=h).json()
    assert any(x["id"] == a["id"] for x in client.get("/api/achievements", headers=h).json())
    client.delete(f"/api/achievements/{a['id']}", headers=h)
    assert client.get("/api/achievements", headers=h).json() == []


def test_application_tracker():
    _, h = signup()
    a = client.post("/api/applications", json={"company": "Acme", "role": "Backend Developer"}, headers=h).json()
    a["stage"] = "Coding Round"
    assert client.put(f"/api/applications/{a['id']}", json=a, headers=h).json()["stage"] == "Coding Round"
    assert client.post("/api/applications", json={"company": "X", "stage": "Not A Stage"}, headers=h).status_code == 400
    assert len(client.get("/api/applications", headers=h).json()) == 1
    assert client.delete(f"/api/applications/{a['id']}", headers=h).status_code == 200


def test_companies_and_roadmap_are_seeded_or_empty_but_reachable():
    _, h = signup()
    assert client.get("/api/guide/companies", headers=h).status_code == 200
    assert client.get("/api/guide/roadmap/Backend Developer", headers=h).status_code == 200


def test_practice_questions():
    _, h = signup()
    r = client.get("/api/practice/questions?limit=5", headers=h)
    assert r.status_code == 200
    for q in r.json():
        assert q["answer"] is None  # answer must stay hidden until attempted


def test_connections_flow():
    _, h1 = signup()
    _, h2 = signup()
    uid2 = client.get("/api/me", headers=h2).json()["id"]
    assert client.post(f"/api/connections/{uid2}", headers=h1).status_code == 200
    assert client.post(f"/api/connections/{uid2}", headers=h1).status_code == 400  # already pending
    incoming = client.get("/api/connections", headers=h2).json()["incoming"]
    assert len(incoming) == 1
    cid = incoming[0]["conn_id"]
    client.post(f"/api/connections/{cid}/respond", json={"accept": True}, headers=h2)
    assert len(client.get("/api/connections", headers=h1).json()["friends"]) == 1
    assert client.post(f"/api/connections/{uid2}/messages", json={"text": "hi there"}, headers=h1).status_code == 200
    msgs = client.get(f"/api/connections/{uid2}/messages", headers=h1).json()
    assert msgs[-1]["text"] == "hi there"


def test_admin_routes_require_admin_role():
    _, h = signup()
    assert client.get("/api/admin/stats", headers=h).status_code == 403


# ---------- profile fields, username, avatar, password (Part 1) ----------
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def test_username_rules_and_availability():
    name = "u_" + uuid4().hex[:8]
    assert client.get("/api/auth/username-available", params={"username": name}).json()["available"] is True
    assert client.get("/api/auth/username-available", params={"username": "a!"}).json()["available"] is False
    email = f"{uuid4().hex[:10]}@test.com"
    r = client.post("/api/auth/register", json={"name": "T", "email": email, "password": "secret123", "username": name})
    assert r.status_code == 200, r.text
    assert client.get("/api/auth/username-available", params={"username": name}).json()["available"] is False
    dup = client.post("/api/auth/register", json={"name": "T", "email": f"{uuid4().hex[:10]}@test.com",
                                                   "password": "secret123", "username": name.upper()})
    assert dup.status_code == 400
    bad = client.post("/api/auth/register", json={"name": "T", "email": f"{uuid4().hex[:10]}@test.com",
                                                   "password": "secret123", "username": "no spaces"})
    assert bad.status_code == 400


def test_signup_without_username_gets_one():
    _, h = signup()
    me = client.get("/api/me", headers=h).json()
    assert len(me["username"]) >= 3 and me["interests"] == [] and me["avatar"] == ""


def test_profile_fields_validation():
    _, h = signup()
    meta = client.get("/api/guide/meta").json()
    assert len(meta["interests"]) == 10
    ok = {"bio": "Final year CS student", "stream": meta["streams"][0], "interests": meta["interests"][:3]}
    assert client.put("/api/me", json=ok, headers=h).status_code == 200
    me = client.get("/api/me", headers=h).json()
    assert me["bio"] == ok["bio"] and me["interests"] == ok["interests"]
    assert client.put("/api/me", json={"interests": ["Nonsense"]}, headers=h).status_code == 400
    assert client.put("/api/me", json={"interests": meta["interests"][:6]}, headers=h).status_code == 400
    assert client.put("/api/me", json={"stream": "Wizardry"}, headers=h).status_code == 400
    assert client.put("/api/me", json={"bio": "x" * 301}, headers=h).status_code == 400
    # an old-style save (no new fields) must not wipe them
    assert client.put("/api/me", json={"headline": "hi"}, headers=h).status_code == 200
    assert client.get("/api/me", headers=h).json()["bio"] == ok["bio"]


def test_avatar_upload_and_remove():
    _, h = signup()
    assert client.post("/api/me/avatar", files={"file": ("a.txt", b"not an image", "text/plain")}, headers=h).status_code == 400
    r = client.post("/api/me/avatar", files={"file": ("a.png", PNG, "image/png")}, headers=h)
    assert r.status_code == 200, r.text
    url = r.json()["avatar"]
    assert client.get(url).status_code == 200
    assert client.get("/api/me", headers=h).json()["avatar"] == url
    assert client.delete("/api/me/avatar", headers=h).status_code == 200
    assert client.get("/api/me", headers=h).json()["avatar"] == ""


def test_change_password():
    email, h = signup()
    assert client.post("/api/auth/change-password", json={"current_password": "wrong", "new_password": "newpass1"}, headers=h).status_code == 400
    assert client.post("/api/auth/change-password", json={"current_password": "secret123", "new_password": "123"}, headers=h).status_code == 400
    assert client.post("/api/auth/change-password", json={"current_password": "secret123", "new_password": "newpass1"}, headers=h).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "newpass1"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "secret123"}).status_code == 400


# ---------- Part 3: achievements edit, cancel / remove connection ----------
def test_achievement_edit():
    _, h = signup()
    a = client.post("/api/achievements", json={"title": "Hack", "type": "Hackathon"}, headers=h).json()
    assert client.post("/api/achievements", json={"title": "x", "link": "javascript:alert(1)"}, headers=h).status_code == 400
    r = client.put("/api/achievements/" + a["id"], json={"title": "Hack 2", "type": "Project", "link": "https://x.dev"}, headers=h)
    assert r.status_code == 200, r.text
    got = client.get("/api/achievements", headers=h).json()[0]
    assert got["title"] == "Hack 2" and got["type"] == "Project" and got["id"] == a["id"]
    assert client.put("/api/achievements/nope", json={"title": "z"}, headers=h).status_code == 404
    assert client.put("/api/achievements/" + a["id"], json={"title": " "}, headers=h).status_code == 400


def test_cancel_and_remove_connection():
    _, ha = signup(); _, hb = signup(); _, hc = signup()
    bid = client.get("/api/me", headers=hb).json()["id"]
    assert client.post("/api/connections/" + bid, headers=ha).status_code == 200
    cid = client.get("/api/connections", headers=ha).json()["sent"][0]["conn_id"]
    assert client.delete("/api/connections/" + cid, headers=hb).status_code == 403   # receiver must Accept/Ignore
    assert client.delete("/api/connections/" + cid, headers=hc).status_code == 404   # outsider
    assert client.delete("/api/connections/" + cid, headers=ha).status_code == 200   # sender cancels
    assert client.get("/api/connections", headers=ha).json()["sent"] == []
    client.post("/api/connections/" + bid, headers=ha)
    cid = client.get("/api/connections", headers=hb).json()["incoming"][0]["conn_id"]
    client.post(f"/api/connections/{cid}/respond", json={"accept": True}, headers=hb)
    assert client.delete("/api/connections/" + cid, headers=hb).status_code == 200   # either side can remove
    assert client.get("/api/connections", headers=ha).json()["friends"] == []