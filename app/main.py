from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .models import ensure_indexes
from .services.rules import UPLOAD_DIR, AVATAR_DIR
from .routes import auth_routes, profile, analyzer, guide, practice, tracker, network, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield

app = FastAPI(title="Job Tracker", lifespan=lifespan)

for r in (auth_routes.router, profile.router, analyzer.router, guide.router,
          practice.router, tracker.router, network.router, admin.router):
    app.include_router(r)

AVATAR_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/admin", StaticFiles(directory=FRONTEND / "admin", html=True), name="admin-ui")
app.mount("/app", StaticFiles(directory=FRONTEND / "app", html=True), name="app-ui")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
# root last so it doesn't shadow the mounts and routes above
app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="ui")