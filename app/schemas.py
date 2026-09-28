from typing import Optional
from pydantic import BaseModel, Field


# ---------- auth ----------
class Reg(BaseModel):
    name: str
    email: str
    password: str


class Login(BaseModel):
    email: str
    password: str


# ---------- profile ----------
class ProfileIn(BaseModel):
    headline: str = ""
    target_role: str = "Backend Developer"
    github: str = ""
    public_profile: bool = True
    show_stats: bool = True


class AchievementIn(BaseModel):
    title: str
    type: str = "Project"   # Project / Certificate / Internship / Hackathon
    link: str = ""
    description: str = ""


class SkillIn(BaseModel):
    name: str
    level: int = Field(ge=1, le=3, default=1)


# ---------- guide content (admin writes, everyone reads) ----------
class StageIn(BaseModel):
    name: str
    what_tested: str = ""
    tips: str = ""


class CompanyIn(BaseModel):
    name: str
    type: str = "Product-based"
    about: str = ""
    requirements: list[str] = []
    stages: list[StageIn] = []


class TopicIn(BaseModel):
    id: str
    title: str
    resources: list[str] = []


class RoadmapIn(BaseModel):
    role: str
    topics: list[TopicIn] = []


class QuestionIn(BaseModel):
    category: str
    difficulty: str = "Easy"
    prompt: str
    options: list[str]
    answer: int
    explanation: str = ""


# ---------- practice / progress ----------
class AttemptIn(BaseModel):
    question_id: str
    selected: int


class TopicDone(BaseModel):
    topic_id: str
    done: bool = True


# ---------- tracker ----------
class AppIn(BaseModel):
    company: str
    role: str = "Software Engineer"
    company_type: str = "Product-based"
    stage: str = "Applied"
    job_url: str = ""
    notes: str = ""
    follow_up: str = ""
    contact: str = ""


class MatchIn(BaseModel):
    jd: str
    resume: str = ""


# ---------- network ----------
class Respond(BaseModel):
    accept: bool


class MessageIn(BaseModel):
    text: str


# ---------- admin ----------
class AnnouncementIn(BaseModel):
    title: str
    body: str


class RoleUpdate(BaseModel):
    is_active: Optional[bool] = None
