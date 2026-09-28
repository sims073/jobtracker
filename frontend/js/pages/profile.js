const TYPE_ICON = { Project: "\uD83D\uDCE6", Certificate: "\uD83C\uDF93", Internship: "\uD83D\uDCBC", Hackathon: "\uD83C\uDFC6" };
(async () => {
  await renderNav("profile");
  const id = new URLSearchParams(location.search).get("id");
  if (id && id !== ME.id) await drawOther(id);
  else await drawSelf();

  async function drawOther(uid) {
    let p;
    try { p = await api("/profile/" + uid); }
    catch (e) { document.getElementById("main").innerHTML = `<div class="card reveal in"><p class="mu">${esc(e.message)}</p></div>`; return; }
    const skills = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
    const connBtn = { none: `<button onclick="connect('${uid}')">Connect</button>`, sent: '<span class="mu">Requested</span>',
      received: `<button onclick="respond('${p.conn_id}')">Accept</button>`, connected: `<button class="ghost" onclick="location.href='/app/network.html'">Message</button>` }[p.status] || "";
    document.getElementById("main").innerHTML = `
      <div class="card reveal in">
        <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${esc(p.name)}</h2>${connBtn}</div>
        <p class="mu">${esc(p.headline || "")}</p>
        <p>Target role: <b>${esc(p.target_role || "")}</b> · Readiness score: <b>${p.score}/100</b> · 🔥 ${p.streak || 0} day streak</p>
        ${p.stats ? `<p class="mu">${p.stats.total} applications · ${p.stats.response_rate}% response rate · ${p.stats.offers} offers</p>` : ""}
        ${p.github ? `<p><a href="${esc(p.github)}" target="_blank" rel="noopener">${esc(p.github)}</a></p>` : ""}
        <div class="chips" style="margin-top:8px">${(p.skills || []).map(s => `<span class="chip">${esc(s.name)} · ${skills[s.level]}</span>`).join("") || '<p class="mu">No skills listed.</p>'}</div>
        <h3 style="margin-top:16px">Achievements</h3>
        <div class="grid g2">${(p.achievements || []).map(a => `<div class="card"><b>${TYPE_ICON[a.type] || ""} ${esc(a.title)}</b><br><span class="mu">${esc(a.type)}</span>${a.description ? `<p class="mu">${esc(a.description)}</p>` : ""}${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Link</a>` : ""}</div>`).join("") || '<p class="mu">No achievements added yet.</p>'}</div>
        <div class="chips" style="margin-top:10px">${(p.badges || []).map(b => `<span class="badge">🏅 ${esc(b)}</span>`).join("")}</div>
      </div>`;
    window.connect = async i => { try { await api("/connections/" + i, "POST"); toast("Request sent"); await drawOther(uid); } catch (e) { toast(e.message); } };
    window.respond = async cid => { await api("/connections/" + cid + "/respond", "POST", { accept: true }); await drawOther(uid); };
  }

  async function drawSelf() {
    const [me, meta] = await Promise.all([api("/me"), api("/guide/meta")]);
    render(me, meta);
  }
  function render(me, meta) {
    document.getElementById("main").innerHTML = `
      <div class="row">
        <div class="card col reveal in">
          <h3>My profile</h3>
          <div class="grid">
            <input id="p-h" placeholder="Headline, e.g. CS student | Python backend" value="${esc(me.headline)}">
            <select id="p-r">${opts(meta.roles, me.target_role)}</select>
            <input id="p-g" placeholder="GitHub URL" value="${esc(me.github || "")}">
            <label><input type="checkbox" id="p-pub" ${me.public_profile ? "checked" : ""}> Public profile (visible in search)</label>
            <label><input type="checkbox" id="p-st" ${me.show_stats ? "checked" : ""}> Show application numbers (no company names)</label>
            <button onclick="saveProfile()">Save profile</button>
          </div>
          <p class="mu" style="margin-top:10px">🔥 ${me.streak} day streak · ${me.xp} XP</p>
          <div class="chips">${(me.badges || []).map(b => `<span class="badge">🏅 ${esc(b)}</span>`).join("") || '<p class="mu">No badges yet — keep your streak and finish topics to earn some.</p>'}</div>
        </div>
        <div class="card col reveal in">
          <h3>Achievements</h3>
          <p class="mu">Certificates, internships, hackathons, projects — anything that makes you stand out.</p>
          <div class="grid">
            <input id="a-t" placeholder="Title">
            <select id="a-y"><option>Project</option><option>Certificate</option><option>Internship</option><option>Hackathon</option></select>
            <input id="a-l" placeholder="Link (optional)">
            <input id="a-d" placeholder="Short description (optional)">
            <button onclick="addAch()">Add achievement</button>
          </div>
          <div class="grid g2" style="margin-top:12px" id="achList">${achList(me.achievements)}</div>
        </div>
      </div>`;
  }
  function achList(list) {
    return (list || []).map(a => `<div class="card"><b>${TYPE_ICON[a.type] || ""} ${esc(a.title)}</b><br><span class="mu">${esc(a.type)}</span>${a.description ? `<p class="mu">${esc(a.description)}</p>` : ""}${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Link</a> · ` : ""}<a onclick="delAch('${a.id}')">Remove</a></div>`).join("") || '<p class="mu">No achievements added yet.</p>';
  }
  window.saveProfile = async () => {
    try {
      await api("/me", "PUT", { headline: document.getElementById("p-h").value, target_role: document.getElementById("p-r").value,
        github: document.getElementById("p-g").value, public_profile: document.getElementById("p-pub").checked, show_stats: document.getElementById("p-st").checked });
      toast("Profile saved");
    } catch (e) { toast(e.message); }
  };
  window.addAch = async () => {
    const title = document.getElementById("a-t").value;
    if (!title.trim()) { toast("Title is required"); return; }
    try {
      await api("/achievements", "POST", { title, type: document.getElementById("a-y").value, link: document.getElementById("a-l").value, description: document.getElementById("a-d").value });
      toast("Achievement added"); confettiBurst(); await drawSelf();
    } catch (e) { toast(e.message); }
  };
  window.delAch = async aid => { await api("/achievements/" + aid, "DELETE"); await drawSelf(); };
})();
