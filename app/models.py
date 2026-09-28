"""
MongoDB has no fixed tables, so this file plays the role models.py used to play
with SQLAlchemy: it names every collection and sets up the indexes each one needs.
Document *shape* (what fields a document has) is documented here in comments and
enforced on the way in by the Pydantic classes in schemas.py.
"""
from .database import db

users = db["users"]              # {name, email, password_hash, role: user/admin,
                                  #  headline, target_role, github, achievements[],
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


async def ensure_indexes():
    await users.create_index("email", unique=True)
    await users.create_index([("name", "text"), ("headline", "text"), ("target_role", "text")])
    await companies.create_index("name", unique=True)
    await roadmaps.create_index("role", unique=True)
    await applications.create_index("user_id")
    await connections.create_index([("sender_id", 1), ("receiver_id", 1)])
    await attempts.create_index("user_id")
