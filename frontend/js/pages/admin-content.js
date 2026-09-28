(async () => {
  await renderAdminNav("content");
  const meta = await api("/guide/meta");
  const TABS = ["Companies", "Roadmaps", "Questions", "Announcements"];
  let tab = "Companies";
  drawShell();

  function drawShell() {
    document.getElementById("main").innerHTML = `
      <div class="row" style="margin-bottom:12px">${TABS.map(t => `<button class="${t === tab ? "" : "ghost"}" onclick="setTab('${t}')">${t}</button>`).join("")}</div>
      <div id="panel"></div>`;
    ({ Companies: drawCompanies, Roadmaps: drawRoadmaps, Questions: drawQuestions, Announcements: drawAnnouncements })[tab]();
  }
  window.setTab = t => { tab = t; drawShell(); };

  // ---------- companies ----------
  async function drawCompanies() {
    const rows = await api("/admin/companies");
    document.getElementById("panel").innerHTML = `
      <div class="row">
        <div class="card col reveal in">
          <h3>Add company</h3>
          <div class="grid">
            <input id="c-n" placeholder="Company name">
            <select id="c-t">${opts(meta.company_types)}</select>
            <textarea id="c-a" rows="2" placeholder="About"></textarea>
            <textarea id="c-r" rows="2" placeholder="Requirements, one per line"></textarea>
            <textarea id="c-s" rows="4" placeholder="Hiring stages, one per line as: Stage name | What's tested | Tips"></textarea>
            <button onclick="saveCompany()">Save company</button>
          </div>
        </div>
        <div class="card col reveal in">
          <h3>Existing companies (${rows.length})</h3>
          <div class="grid">${rows.map(c => `<div class="person"><b>${esc(c.name)}</b><span class="chip">${esc(c.type)}</span><span class="mu">${c.stages.length} stages</span><a onclick="delCompany('${c.id}')">Delete</a></div>`).join("") || '<p class="mu">No companies yet.</p>'}</div>
        </div>
      </div>`;
  }
  window.saveCompany = async () => {
    const name = document.getElementById("c-n").value;
    if (!name.trim()) { toast("Company name is required"); return; }
    const stages = document.getElementById("c-s").value.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const [n, w, t] = l.split("|").map(x => (x || "").trim());
      return { name: n || l, what_tested: w || "", tips: t || "" };
    });
    const requirements = document.getElementById("c-r").value.split("\n").map(l => l.trim()).filter(Boolean);
    try {
      await api("/admin/companies", "POST", { name, type: document.getElementById("c-t").value, about: document.getElementById("c-a").value, requirements, stages });
      toast("Company added"); await drawCompanies();
    } catch (e) { toast(e.message); }
  };
  window.delCompany = async id => { if (!confirm("Delete this company?")) return; await api("/admin/companies/" + id, "DELETE"); await drawCompanies(); };

  // ---------- roadmaps ----------
  async function drawRoadmaps(role) {
    role = role || meta.roles[0];
    const all = await api("/admin/roadmaps");
    const current = all.find(r => r.role === role);
    const topicsText = (current?.topics || []).map(t => `${t.id} | ${t.title} | ${(t.resources || []).join(";")}`).join("\n");
    document.getElementById("panel").innerHTML = `
      <div class="card reveal in">
        <div class="row" style="align-items:center;justify-content:space-between"><h3 style="margin:0">Roadmap topics</h3><select onchange="drawRoadmaps(this.value)">${opts(meta.roles, role)}</select></div>
        <p class="mu">One topic per line: short-id | Title | resource1;resource2 (id must stay stable — it's used to track user progress)</p>
        <textarea id="rm-t" rows="10">${esc(topicsText)}</textarea>
        <button style="margin-top:8px" onclick="saveRoadmap('${role}')">Save roadmap</button>
      </div>`;
  }
  window.drawRoadmaps = drawRoadmaps;
  window.saveRoadmap = async role => {
    const topics = document.getElementById("rm-t").value.split("\n").map(l => l.trim()).filter(Boolean).map((l, i) => {
      const [id, title, res] = l.split("|").map(x => (x || "").trim());
      return { id: id || "t" + i, title: title || l, resources: res ? res.split(";").map(x => x.trim()).filter(Boolean) : [] };
    });
    try { await api("/admin/roadmaps/" + encodeURIComponent(role), "PUT", { role, topics }); toast("Roadmap saved"); }
    catch (e) { toast(e.message); }
  };

  // ---------- questions ----------
  async function drawQuestions() {
    const rows = await api("/admin/questions");
    document.getElementById("panel").innerHTML = `
      <div class="row">
        <div class="card col reveal in">
          <h3>Add question</h3>
          <div class="grid">
            <input id="q-c" placeholder="Category, e.g. DSA">
            <select id="q-d"><option>Easy</option><option>Medium</option><option>Hard</option></select>
            <textarea id="q-p" rows="2" placeholder="Question prompt"></textarea>
            <textarea id="q-o" rows="3" placeholder="Options, one per line (at least 2)"></textarea>
            <input id="q-a" type="number" min="0" placeholder="Correct option number (0-based index)">
            <textarea id="q-e" rows="2" placeholder="Explanation"></textarea>
            <button onclick="saveQuestion()">Save question</button>
          </div>
        </div>
        <div class="card col reveal in">
          <h3>Existing questions (${rows.length})</h3>
          <div class="grid">${rows.map(q => `<div class="person"><b>${esc(q.category)}</b><span class="chip">${esc(q.difficulty)}</span><span class="mu" style="flex:1">${esc(q.prompt.slice(0, 60))}${q.prompt.length > 60 ? "…" : ""}</span><a onclick="delQuestion('${q.id}')">Delete</a></div>`).join("") || '<p class="mu">No questions yet.</p>'}</div>
        </div>
      </div>`;
  }
  window.saveQuestion = async () => {
    const options = document.getElementById("q-o").value.split("\n").map(l => l.trim()).filter(Boolean);
    try {
      await api("/admin/questions", "POST", {
        category: document.getElementById("q-c").value, difficulty: document.getElementById("q-d").value,
        prompt: document.getElementById("q-p").value, options, answer: +document.getElementById("q-a").value || 0,
        explanation: document.getElementById("q-e").value,
      });
      toast("Question added"); await drawQuestions();
    } catch (e) { toast(e.message); }
  };
  window.delQuestion = async id => { if (!confirm("Delete this question?")) return; await api("/admin/questions/" + id, "DELETE"); await drawQuestions(); };

  // ---------- announcements ----------
  async function drawAnnouncements() {
    const rows = await api("/admin/announcements");
    document.getElementById("panel").innerHTML = `
      <div class="row">
        <div class="card col reveal in">
          <h3>New announcement</h3>
          <div class="grid"><input id="an-t" placeholder="Title"><textarea id="an-b" rows="3" placeholder="Body"></textarea><button onclick="saveAnn()">Post announcement</button></div>
        </div>
        <div class="card col reveal in">
          <h3>Posted (${rows.length})</h3>
          <div class="grid">${rows.map(a => `<div class="person"><b>${esc(a.title)}</b><span class="mu" style="flex:1">${esc(a.body.slice(0, 50))}</span><a onclick="delAnn('${a.id}')">Delete</a></div>`).join("") || '<p class="mu">No announcements yet.</p>'}</div>
        </div>
      </div>`;
  }
  window.saveAnn = async () => {
    const title = document.getElementById("an-t").value, body = document.getElementById("an-b").value;
    if (!title.trim() || !body.trim()) { toast("Title and body are required"); return; }
    await api("/admin/announcements", "POST", { title, body }); toast("Announcement posted"); await drawAnnouncements();
  };
  window.delAnn = async id => { await api("/admin/announcements/" + id, "DELETE"); await drawAnnouncements(); };
})();
