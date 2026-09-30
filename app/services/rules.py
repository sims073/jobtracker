"""Shared rules for profile fields: usernames, streams, interests, avatar files."""
import re
from pathlib import Path

STREAMS = ["Science", "Commerce", "Arts", "Engineering / Technology", "Medical / Health",
           "Law", "Management", "Other"]

INTERESTS = ["Engineering", "Medical", "Biotechnology", "Information Technology",
             "Data Science & AI", "Business & Management", "Finance & Commerce",
             "Design & Arts", "Law & Civil Services", "Education & Research"]
MAX_INTERESTS = 5
MAX_BIO = 300

USERNAME_RE = re.compile(r"[a-z0-9_]{3,20}")
RESERVED = {"admin", "root", "support", "jobtracker", "api", "null", "system"}

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
AVATAR_DIR = UPLOAD_DIR / "avatars"
MAX_AVATAR_BYTES = 2 * 1024 * 1024


def clean_username(s):
    return (s or "").strip().lstrip("@").lower()


def username_error(name):
    """Return a message if `name` (already cleaned) is not allowed, else None."""
    if not USERNAME_RE.fullmatch(name):
        return "Username must be 3-20 characters: lowercase letters, numbers or underscore"
    if name in RESERVED:
        return "This username is reserved"
    return None


def clean_interests(items):
    """Return (clean_list, error). Keeps order, drops duplicates."""
    out = []
    for i in items or []:
        if i not in INTERESTS:
            return None, f"Unknown interest: {i}"
        if i not in out:
            out.append(i)
    if len(out) > MAX_INTERESTS:
        return None, f"Pick at most {MAX_INTERESTS} interests"
    return out, None


def image_ext(head: bytes):
    """Detect the real image type from the first bytes (don't trust the filename)."""
    if head[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ".webp"
    return None