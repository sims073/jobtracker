from datetime import datetime, timezone

BADGES = [
    (50, "Getting Started"),
    (200, "On a Roll"),
    (500, "Career Ready"),
    (1000, "Job Tracker Pro"),
]


def touch_streak(user):
    """Update daily streak + return (streak, xp_gained_for_login)."""
    today = datetime.now(timezone.utc).date()
    last = user.get("last_active")
    last_date = last.date() if isinstance(last, datetime) else None
    streak = user.get("streak", 0)
    xp = 0
    if last_date == today:
        pass  # already counted today
    elif last_date and (today - last_date).days == 1:
        streak += 1
        xp = 5
    else:
        streak = 1
        xp = 5
    return streak, xp, today


def new_badges(total_xp, current_badges):
    return [name for threshold, name in BADGES if total_xp >= threshold and name not in current_badges]
