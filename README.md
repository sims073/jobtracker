# Job Tracker — IT Fresher Career Platform

Self-analyzer + IT hiring guide + role roadmaps + practice questions +
application tracker + connections/chat + gamification (XP, streaks, badges) +
an admin panel — for BSc/BCA/B.Tech students preparing for IT job hiring.

Backend: **FastAPI** + **MongoDB** (via PyMongo's native async API — not the
now-deprecated Motor driver). Frontend: plain **HTML + CSS + JavaScript**
(no build step).

## 1. Get MongoDB running

Pick one:

- **Local:** install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
  and make sure it's running on `mongodb://localhost:27017` (the default).
  [MongoDB Compass](https://www.mongodb.com/products/compass) is a handy free
  GUI to look at your data while you build.
- **Cloud (no install):** create a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
  cluster and copy its connection string.

## 2. Configure

Copy `.env.example` to `.env` and adjust if needed (`MONGO_URL` in particular
if you're using Atlas). This project doesn't auto-load `.env`, so either:

```bash
export $(cat .env | xargs)          # Linux/Mac
# or just set MONGO_URL, DB_NAME, SECRET_KEY as real environment variables
```

## 3. Install & seed

```bash
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m seed.seed      # loads companies/roadmaps/questions + creates an admin account
```

The seed script prints the admin login it created
(`admin@devtrack.local` / `admin123` by default — change the password after
your first login, or set `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars before
seeding). It's safe to re-run; it only inserts what's missing.

## 4. Run

```bash
uvicorn app.main:app --reload
```

- App: http://127.0.0.1:8000
- Admin panel: http://127.0.0.1:8000/admin/index.html (log in with the admin
  account first, at /login.html)
- API docs: http://127.0.0.1:8000/docs

## 5. Tests

Tests need a real MongoDB to talk to (point them at a throwaway database so
they never touch your real data):

```bash
MONGO_URL=mongodb://localhost:27017 DB_NAME=devtrack_test pytest
```

## Structure

```
app/
  main.py            FastAPI app: wires routers + serves the frontend
  database.py         MongoDB connection + oid()/ser() helpers
  models.py            Collection handles + index setup (Mongo has no schema/
                       tables, so this plays that role — document shape is
                       documented in comments and enforced by schemas.py)
  schemas.py           Pydantic request-body validation
  auth.py              Password hashing, JWT, current_user/require_admin
  routes/
    auth_routes.py     register / login
    profile.py         profile, achievements, skills, user search, public profile
    analyzer.py        readiness score, resume-vs-JD match
    guide.py            companies + hiring stages + roadmaps (read side)
    practice.py         quiz questions + roadmap topic progress
    tracker.py          Kanban application tracker
    network.py          connections + chat
    admin.py            stats + user management + content CRUD (admin-only)
  services/
    scoring.py           IT skills list, role weights, readiness formula, JD matching
    gamification.py     streaks + XP + badge thresholds
seed/
  seed.py              loads seed/data/*.json into MongoDB, creates the admin
  data/                companies.json, roadmaps.json, questions.json
frontend/
  index.html           animated landing page
  login.html
  app/                 dashboard, analyzer, roadmap, companies, practice, tracker, network, profile
  admin/               index (stats), users, content (companies/roadmaps/questions/announcements CRUD)
  css/  js/            shared styles + shared JS (api.js, auth.js, ui.js, animations.js) + js/pages/*.js per page
tests/
  test_api.py
```

## Notes for your presentation

- The **readiness score** (Self Analyzer) is a weighted formula in
  `services/scoring.py`: skills (role-specific weights) + roadmap progress +
  application activity + response rate. It's easy to explain on a whiteboard.
- **Achievements**, **skills**, and **badges** are embedded arrays inside each
  user document — a good talking point for why you chose MongoDB (related
  data that's always read together, stored together, no joins needed).
- The **admin dashboard** uses MongoDB aggregation pipelines (`$group`) to
  compute applications-by-stage and users-by-role — worth mentioning if asked
  about database-side computation vs. doing it in Python.
- Company hiring-stage data and roadmap topics in `seed/data/` are a
  reasonable general picture, not scraped from official sources — mention
  this if presenting to companies, and let admins update it over time from
  the admin panel.
