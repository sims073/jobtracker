const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const opts = (arr, val) => arr.map(x => `<option ${x === val ? "selected" : ""}>${esc(x)}</option>`).join("");

function avatarHTML(p, size = "") {
  const cls = "avatar" + (size ? " " + size : "");
  if (p && p.avatar) return `<img class="${cls}" src="${esc(p.avatar)}" alt="">`;
  return `<span class="${cls}">${esc(((p && p.name) || "?").trim().charAt(0).toUpperCase())}</span>`;
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = 1;
  setTimeout(() => (el.style.opacity = 0), 2600);
}

const TABS = [
  ["dashboard", "Dashboard"], ["analyzer", "Analyzer"], ["roadmap", "Roadmap"],
  ["companies", "Companies"], ["practice", "Practice"], ["tracker", "Tracker"],
  ["network", "Network"], ["profile", "Profile"],
];

async function renderNav(active) {
  const nav = document.getElementById("appNav");
  if (!nav) return;
  let me = {};
  try { me = await api("/me"); } catch (e) { return; }
  nav.innerHTML = `
    <header class="top"><div class="wrap">
      <span class="brand">Job Tracker</span>
      <nav class="main">${TABS.map(([k, l]) => `<a href="/app/${k}.html" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>
      <a href="/app/profile.html" title="My profile">${avatarHTML(me, "sm")}</a>
      <span class="xp-pill">🔥 <span class="streak">${me.streak || 0}</span> day streak · ${me.xp || 0} XP</span>
      ${me.role === "admin" ? '<a href="/admin/index.html">Admin</a>' : ""}
      <a onclick="logout()">Log out</a>
    </div></header>`;
  window.ME = me;
}

const ADMIN_TABS = [["index", "Dashboard"], ["users", "Users"], ["content", "Content"]];

async function renderAdminNav(active) {
  const nav = document.getElementById("appNav");
  if (!nav) return;
  let me = {};
  try { me = await api("/me"); } catch (e) { return; }
  if (me.role !== "admin") { document.body.innerHTML = '<div class="wrap" style="padding-top:60px"><div class="card">Admin access required. <a href="/app/dashboard.html">Back to app</a></div></div>'; throw new Error("not admin"); }
  nav.innerHTML = `
    <header class="top"><div class="wrap">
      <span class="brand">Job Tracker <span class="chip">Admin</span></span>
      <nav class="main">${ADMIN_TABS.map(([k, l]) => `<a href="/admin/${k}.html" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>
      <a href="/app/dashboard.html">Back to app</a>
      <a onclick="logout()">Log out</a>
    </div></header>`;
  window.ME = me;
}

function runReveal() {
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

function animateCounters() {
  document.querySelectorAll("[data-count]").forEach(el => {
    const target = +el.dataset.count, dur = 900, start = performance.now();
    function step(t) {
      const p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function confettiBurst() {
  const box = document.createElement("div");
  box.className = "confetti";
  document.body.appendChild(box);
  const colors = ["#5b8cff", "#8f6bff", "#28c790", "#ffb454"];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement("div");
    const c = colors[i % colors.length], x = Math.random() * 100, dur = 900 + Math.random() * 500;
    p.style.cssText = `position:absolute;left:${x}vw;top:-10px;width:8px;height:8px;background:${c};border-radius:2px;animation:floatUp ${dur}ms ease-out forwards`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  setTimeout(() => box.remove(), 1600);
}