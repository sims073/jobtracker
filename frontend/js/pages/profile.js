const TYPE_ICON = { Project: "\uD83D\uDCE6", Certificate: "\uD83C\uDF93", Internship: "\uD83D\uDCBC", Hackathon: "\uD83C\uDFC6" };
const LVL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
const el = id => document.getElementById(id);
const v = id => el(id).value;
const safeUrl = u => (/^https?:\/\//i.test(u || "") ? u : "");

(async () => {
  await renderNav("profile");
  const id = new URLSearchParams(location.search).get("id");
  if (id && id !== ME.id) await drawOther(id); else await drawSelf();

  // ---------- shared pieces ----------
  const header = (p, actions) => `
    <div class="pcard reveal in">
      <div class="pbanner"></div>
      <div class="pbody">
        <div class="prow">${avatarHTML(p, "xl")}<div class="row" style="gap:8px">${actions}</div></div>
        <h2 style="margin:12px 0 0">${esc(p.name)}</h2>
        <div class="uname">@${esc(p.username || "")}</div>
        ${p.headline ? `<p style="margin:6px 0">${esc(p.headline)}</p>` : ""}
        <p class="mu" style="margin:0 0 8px">${[p.stream, p.target_role].filter(Boolean).map(esc).join(" · ")}</p>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ""}
        <div>${(p.interests || []).map(i => `<span class="chip">${esc(i)}</span>`).join("")}</div>
        ${safeUrl(p.github) ? `<p><a href="${esc(p.github)}" target="_blank" rel="noopener">${esc(p.github)}</a></p>` : ""}
        <p class="mu">🔥 ${p.streak || 0} day streak · ${p.xp || 0} XP${p.score != null ? ` · Readiness ${p.score}/100` : ""}</p>
        ${p.stats ? `<p class="mu">${p.stats.total} applications · ${p.stats.response_rate}% response rate · ${p.stats.offers} offers</p>` : ""}
      </div>
    </div>`;
  const skillsBadges = p => `
    <div class="card reveal in" style="margin-top:16px"><h3>Skills</h3>
      <div>${(p.skills || []).map(s => `<span class="chip">${esc(s.name)} · ${LVL[s.level]}</span>`).join("") || '<p class="mu">No skills listed.</p>'}</div>
      <div style="margin-top:10px">${(p.badges || []).map(b => `<span class="badge">🏅 ${esc(b)}</span>`).join("")}</div>
    </div>`;
  const achCard = (a, own) => `<div class="card"><b>${TYPE_ICON[a.type] || ""} ${esc(a.title)}</b><br><span class="mu">${esc(a.type)}</span>${a.description ? `<p class="mu">${esc(a.description)}</p>` : ""}${safeUrl(a.link) ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Link</a>` : ""}${own ? ` · <a onclick="editAch('${a.id}')">Edit</a> · <a onclick="delAch('${a.id}')">Remove</a>` : ""}</div>`;

  // ---------- someone else's profile ----------
  async function drawOther(uid) {
    let p;
    try { p = await api("/profile/" + uid); }
    catch (e) { el("main").innerHTML = `<div class="card reveal in"><p class="mu">${esc(e.message)}</p></div>`; return; }
    const act = { none: `<button onclick="connect('${uid}')">Connect</button>`, sent: `<span class="mu">Requested</span><button class="ghost" onclick="cancelReq('${p.conn_id}')">Cancel request</button>`,
      received: `<button onclick="respond('${p.conn_id}',true)">Accept</button><button class="ghost" onclick="respond('${p.conn_id}',false)">Ignore</button>`,
      connected: `<button onclick="location.href='/app/network.html?chat=${uid}'">Message</button><button class="ghost" onclick="removeConn('${p.conn_id}')">Remove</button>` }[p.status] || "";
    el("main").innerHTML = header(p, act) + skillsBadges(p) + `
      <div class="card reveal in" style="margin-top:16px"><h3>Achievements</h3>
        <div class="grid g2">${(p.achievements || []).map(a => achCard(a, false)).join("") || '<p class="mu">No achievements added yet.</p>'}</div></div>`;
    window.connect = async i => { try { await api("/connections/" + i, "POST"); toast("Request sent"); await drawOther(uid); } catch (e) { toast(e.message); } };
    window.cancelReq = async cid => { try { await api("/connections/" + cid, "DELETE"); toast("Request cancelled"); await drawOther(uid); } catch (e) { toast(e.message); } };
    window.removeConn = async cid => { if (!confirm("Remove this connection?")) return; try { await api("/connections/" + cid, "DELETE"); toast("Connection removed"); await drawOther(uid); } catch (e) { toast(e.message); } };
    window.respond = async (cid, accept) => { try { await api("/connections/" + cid + "/respond", "POST", { accept }); await drawOther(uid); } catch (e) { toast(e.message); } };
  }

  // ---------- my profile ----------
  let me, meta;
  async function drawSelf() {
    [me, meta] = await Promise.all([api("/me"), api("/guide/meta")]);
    el("main").innerHTML = header(me, '<button onclick="openEdit()">✏️ Edit profile</button>') + skillsBadges(me) + `
      <div class="row" style="margin-top:16px">
        <div class="card col reveal in"><h3>Add achievement</h3>
          <p class="mu">Certificates, internships, hackathons, projects — anything that makes you stand out.</p>
          <div class="grid">
            <input id="a-t" placeholder="Title">
            <select id="a-y"><option>Project</option><option>Certificate</option><option>Internship</option><option>Hackathon</option></select>
            <input id="a-l" placeholder="Link (optional, https://...)">
            <input id="a-d" placeholder="Short description (optional)">
            <button onclick="addAch()">Add achievement</button>
          </div></div>
        <div class="card col reveal in"><h3>My achievements</h3>
          <div class="grid g2">${(me.achievements || []).map(a => achCard(a, true)).join("") || '<p class="mu">No achievements added yet.</p>'}</div></div>
      </div>
      <div class="card reveal in" style="margin-top:16px"><h3>Security</h3>
        <div class="row" style="align-items:center">
          <input id="pw-c" type="password" placeholder="Current password">
          <input id="pw-n" type="password" placeholder="New password (min 6)">
          <input id="pw-n2" type="password" placeholder="Confirm new password">
          <button onclick="changePw()">Change password</button>
        </div></div>`;
  }

  // ---------- edit modal ----------
  let sel = [];
  const chips = () => meta.interests.map((i, k) => `<span class="chip pick ${sel.includes(i) ? "on" : ""}" onclick="togInt(${k})">${esc(i)}</span>`).join("");
  window.openEdit = () => {
    sel = [...(me.interests || [])];
    const bg = document.createElement("div");
    bg.className = "modal-bg"; bg.id = "modal";
    bg.onclick = e => { if (e.target === bg) closeEdit(); };
    bg.innerHTML = `<div class="modal">
      <h3>Edit profile</h3>
      <div class="row" style="align-items:center;margin-bottom:12px">
        <div id="mAv">${avatarHTML(me, "xl")}</div>
        <div class="grid"><input type="file" id="avFile" accept="image/png,image/jpeg,image/webp" hidden onchange="upAvatar(event)">
          <button onclick="el('avFile').click()">Upload photo</button>
          <button class="ghost" onclick="rmAvatar()">Remove photo</button>
          <span class="mu hint">JPG, PNG or WEBP, up to 2 MB</span></div>
      </div>
      <div class="grid">
        <div class="fld"><label>Username</label><input id="m-u" value="${esc(me.username)}" oninput="checkU()" maxlength="20"><span class="hint" id="uh"></span></div>
        <div class="fld"><label>Headline</label><input id="m-h" value="${esc(me.headline || "")}" placeholder="CS student | Python backend"></div>
        <div class="fld"><label>Bio</label><textarea id="m-b" rows="3" maxlength="300" oninput="el('bc').textContent=this.value.length+'/300'">${esc(me.bio || "")}</textarea><span class="mu hint" id="bc">${(me.bio || "").length}/300</span></div>
        <div class="row"><div class="fld col"><label>Stream</label><select id="m-s"><option value="">Select stream</option>${opts(meta.streams, me.stream)}</select></div>
          <div class="fld col"><label>Target role</label><select id="m-r">${opts(meta.roles, me.target_role)}</select></div></div>
        <div class="fld"><label>Interests (pick up to 5)</label><div id="m-i">${chips()}</div></div>
        <div class="fld"><label>GitHub URL</label><input id="m-g" value="${esc(me.github || "")}" placeholder="https://github.com/you"></div>
        <label><input type="checkbox" id="m-pub" ${me.public_profile ? "checked" : ""}> Public profile (visible in search)</label>
        <label><input type="checkbox" id="m-st" ${me.show_stats ? "checked" : ""}> Show application numbers (no company names)</label>
        <div class="row"><button onclick="saveEdit()">Save changes</button><button class="ghost" onclick="closeEdit()">Cancel</button></div>
      </div></div>`;
    document.body.appendChild(bg);
  };
  window.closeEdit = () => { const m = el("modal"); if (m) m.remove(); };
  addEventListener("keydown", e => { if (e.key === "Escape") closeEdit(); });
  window.el = el;

  window.togInt = k => {
    const i = meta.interests[k];
    if (sel.includes(i)) sel = sel.filter(x => x !== i);
    else if (sel.length >= 5) { toast("You can pick up to 5 interests"); return; }
    else sel.push(i);
    el("m-i").innerHTML = chips();
  };
  let t;
  window.checkU = () => {
    clearTimeout(t);
    const name = v("m-u").trim().toLowerCase().replace(/^@/, ""), h = el("uh");
    if (name === me.username) { h.textContent = ""; return; }
    t = setTimeout(async () => {
      try {
        const r = await api("/auth/username-available?username=" + encodeURIComponent(name));
        h.textContent = r.available ? "✓ Available" : r.reason;
        h.className = "hint " + (r.available ? "ok" : "bad");
      } catch (e) {}
    }, 350);
  };
  window.upAvatar = async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast("Image must be smaller than 2 MB"); return; }
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch("/api/me/avatar", { method: "POST", headers: { Authorization: "Bearer " + token() }, body: fd });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast(typeof d.detail === "string" ? d.detail : "Upload failed"); return; }
    me.avatar = d.avatar; el("mAv").innerHTML = avatarHTML(me, "xl"); toast("Photo updated");
  };
  window.rmAvatar = async () => {
    try { await api("/me/avatar", "DELETE"); me.avatar = ""; el("mAv").innerHTML = avatarHTML(me, "xl"); toast("Photo removed"); }
    catch (e) { toast(e.message); }
  };
  window.saveEdit = async () => {
    try {
      await api("/me", "PUT", { username: v("m-u"), headline: v("m-h"), bio: v("m-b"), stream: v("m-s"), target_role: v("m-r"),
        github: v("m-g"), interests: sel, public_profile: el("m-pub").checked, show_stats: el("m-st").checked });
      closeEdit(); toast("Profile saved"); await renderNav("profile"); await drawSelf();
    } catch (e) { toast(e.message); }
  };

  // ---------- achievements ----------
  window.addAch = async () => {
    const title = v("a-t");
    if (!title.trim()) { toast("Title is required"); return; }
    try {
      await api("/achievements", "POST", { title, type: v("a-y"), link: v("a-l"), description: v("a-d") });
      toast("Achievement added"); confettiBurst(); await drawSelf();
    } catch (e) { toast(e.message); }
  };
  window.editAch = id => {
    const a = (me.achievements || []).find(x => x.id === id);
    if (!a) return;
    const bg = document.createElement("div");
    bg.className = "modal-bg"; bg.id = "modal";
    bg.onclick = e => { if (e.target === bg) closeEdit(); };
    bg.innerHTML = `<div class="modal"><h3>Edit achievement</h3><div class="grid">
      <div class="fld"><label>Title</label><input id="e-t" value="${esc(a.title)}"></div>
      <div class="fld"><label>Type</label><select id="e-y">${opts(["Project", "Certificate", "Internship", "Hackathon"], a.type)}</select></div>
      <div class="fld"><label>Link (https://...)</label><input id="e-l" value="${esc(a.link || "")}"></div>
      <div class="fld"><label>Description</label><input id="e-d" value="${esc(a.description || "")}"></div>
      <div class="row"><button onclick="saveAch('${id}')">Save changes</button><button class="ghost" onclick="closeEdit()">Cancel</button></div></div></div>`;
    document.body.appendChild(bg);
  };
  window.saveAch = async id => {
    try {
      await api("/achievements/" + id, "PUT", { title: v("e-t"), type: v("e-y"), link: v("e-l"), description: v("e-d") });
      closeEdit(); toast("Achievement updated"); await drawSelf();
    } catch (e) { toast(e.message); }
  };
  window.changePw = async () => {
    if (v("pw-n") !== v("pw-n2")) { toast("New passwords do not match"); return; }
    try {
      await api("/auth/change-password", "POST", { current_password: v("pw-c"), new_password: v("pw-n") });
      ["pw-c", "pw-n", "pw-n2"].forEach(i => (el(i).value = "")); toast("Password changed");
    } catch (e) { toast(e.message); }
  };
  window.delAch = async aid => { await api("/achievements/" + aid, "DELETE"); await drawSelf(); };
})();