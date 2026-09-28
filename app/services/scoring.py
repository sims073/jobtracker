import re

COMPANY_TYPES = ["Service-based", "Product-based", "Startup"]
STAGES = ["Applied", "Online Assessment", "Coding Round", "Technical Interview",
          "System Design", "HR", "Offer", "Rejected"]

SKILLS = {
    "Languages": ["Python", "Java", "C++", "JavaScript", "TypeScript", "Go"],
    "Web & Frameworks": ["HTML/CSS", "React", "Node.js", "FastAPI", "Django", "Spring Boot", "REST APIs"],
    "Tools & Cloud": ["Git", "Docker", "Kubernetes", "AWS", "Linux", "CI/CD", "Testing", "Excel"],
    "CS Fundamentals": ["DSA", "OOP", "DBMS", "SQL", "OS", "Networking"],
    "Data": ["Pandas", "Machine Learning"],
}
ALL_SKILLS = [s for group in SKILLS.values() for s in group]

ALIASES = {
    "HTML/CSS": ["html", "css"], "REST APIs": ["rest", "restful", "api", "apis"],
    "DSA": ["dsa", "data structures", "algorithms"], "SQL": ["sql", "mysql", "postgresql", "postgres"],
    "JavaScript": ["javascript", "js"], "Node.js": ["node.js", "nodejs", "node"],
    "Spring Boot": ["spring boot", "spring"], "OS": ["operating system", "operating systems"],
    "DBMS": ["dbms", "database", "databases"], "Machine Learning": ["machine learning", "ml"],
    "AWS": ["aws", "amazon web services"], "CI/CD": ["ci/cd", "jenkins", "github actions"],
    "Testing": ["testing", "selenium", "pytest", "junit"], "Linux": ["linux", "unix"],
    "Git": ["git", "github"], "Go": ["golang"], "Networking": ["networking", "tcp/ip"],
}

ROLE_WEIGHTS = {
    "Backend Developer": {"Python": 3, "SQL": 3, "REST APIs": 3, "DSA": 3, "Git": 2, "DBMS": 2, "OOP": 2, "Docker": 1},
    "Frontend Developer": {"JavaScript": 3, "React": 3, "HTML/CSS": 3, "Git": 2, "REST APIs": 2, "TypeScript": 1, "DSA": 1},
    "Full Stack Developer": {"JavaScript": 2, "React": 2, "Node.js": 2, "SQL": 2, "REST APIs": 2, "Git": 2, "HTML/CSS": 2, "DSA": 2, "Docker": 1},
    "Data Analyst": {"Python": 3, "SQL": 3, "Pandas": 3, "Excel": 2, "Machine Learning": 1, "DSA": 1},
    "DevOps Engineer": {"Linux": 3, "Docker": 3, "AWS": 3, "CI/CD": 3, "Git": 2, "Kubernetes": 2, "Networking": 2, "Python": 1},
    "QA / Testing": {"Testing": 3, "Python": 2, "Java": 2, "SQL": 2, "Git": 2, "REST APIs": 2, "Linux": 1},
    "Software Engineer": {"DSA": 3, "OOP": 3, "Python": 2, "Java": 2, "DBMS": 2, "OS": 2, "Git": 2, "SQL": 2},
}


def safe_role(role):
    return role if role in ROLE_WEIGHTS else "Software Engineer"


def find_skills(text):
    t = text.lower()
    found = []
    for name in ALL_SKILLS:
        for w in ALIASES.get(name, [name.lower()]):
            if re.search(r"(?<![a-z0-9+])" + re.escape(w) + r"(?![a-z0-9+])", t):
                found.append(name)
                break
    return found


def readiness(skills, role, topics_done, total_apps, response_rate):
    """Score out of 100: skills 55 + roadmap progress 25 + application activity 10 + response rate 10."""
    role = safe_role(role)
    w = ROLE_WEIGHTS[role]
    skill_pct = sum(wt * min(skills.get(n, 0), 3) / 3 for n, wt in w.items()) / sum(w.values())
    roadmap_pct = min(topics_done / 20, 1)
    act = min(total_apps / 20, 1)
    resp = response_rate / 100
    parts = {"skills": round(55 * skill_pct), "roadmap": round(25 * roadmap_pct),
             "activity": round(10 * act), "response": round(10 * resp)}
    missing = [n for n, _ in sorted(w.items(), key=lambda x: -x[1]) if skills.get(n, 0) < 2][:4]
    tips = []
    if missing:
        tips.append("Learn or strengthen: " + ", ".join(missing))
    if topics_done < 15:
        tips.append("Complete more topics in your role's roadmap")
    if total_apps < 20:
        tips.append("Apply to more companies, aim for 20+ applications")
    if total_apps >= 5 and response_rate < 20:
        tips.append("Low response rate: tailor your resume to each job description's keywords")
    return {"score": sum(parts.values()), "breakdown": parts, "missing": missing, "tips": tips}
