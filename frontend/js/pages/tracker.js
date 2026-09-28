(async () => {
  await renderNav("tracker");
  const meta = await api("/guide/meta");
  const today = () => new Date().toISOString().slice(0, 10);
  let APPS = await api("/applications");
  draw();

  function draw() {
    document.getElementById("main").innerHTML = `
      <div class="row" style="margin-bottom:10px"><input id="q" placeholder="Search company or role" oninput="board()" style="flex:1"><button onclick="addForm()">Add application</button></div>
      <div id="form"></div><div id="board" class="board reveal in"></div>`;
    board();
  }
  function card(a) {
    return `<div class="appcard" draggable="true" ondragstart="event.dataTransfer.setData('id','${a.id}')">
      <b>${esc(a.company)}</b><div class="mu">${esc(a.role)}</div><span class="chip">${esc(a.company_type)}</span>
      ${a.follow_up ? `<div class="${a.follow_up <= today() && !["Offer", "Rejected"].includes(a.stage) ? "bad" : "mu"}">Follow up: ${esc(a.follow_up)}</div>` : ""}
      ${a.contact ? `<div class="mu">${esc(a.contact)}</div>` : ""}
      <div>${/^https?:\/\//.test(a.job_url) ? `<a href="${esc(a.job_url)}" target="_blank" rel="noopener">Link</a> · ` : ""}<a onclick="delApp('${a.id}')">Delete</a></div></div>`;
  }
  window.board = () => {
    const q = (document.getElementById("q").value || "").toLowerCase();
    document.getElementById("board").innerHTML = meta.stages.map(s => {
      const l = APPS.filter(a => a.stage === s);
      return `<div class="col" ondragover="event.preventDefault()" ondrop="drop(event,'${s}')"><h4>${s} <em>${l.length}</em></h4>${l.filter(a => (a.company + a.role).toLowerCase().includes(q)).map(card).join("")}</div>`;
    }).join("");
  };
  window.drop = async (e, s) => {
    const a = APPS.find(x => x.id === e.dataTransfer.getData("id"));
    if (!a || a.stage === s) return;
    const old = a.stage; a.stage = s; board();
    try { await api("/applications/" + a.id, "PUT", a); if (s === "Offer") { toast("Offer! 🎉"); confettiBurst(); } }
    catch (err) { a.stage = old; board(); toast(err.message); }
  };
  window.addForm = () => {
    document.getElementById("form").innerHTML = `<div class="card grid g3 reveal in">
      <input id="f-c" placeholder="Company"><select id="f-r">${opts(meta.roles)}</select><select id="f-t">${opts(meta.company_types)}</select>
      <input id="f-u" placeholder="Job URL"><input id="f-d" type="date" title="Follow-up date"><input id="f-p" placeholder="Recruiter / contact">
      <input id="f-n" placeholder="Notes"><button onclick="saveApp()">Save application</button></div>`;
  };
  window.saveApp = async () => {
    try {
      const a = await api("/applications", "POST", { company: document.getElementById("f-c").value, role: document.getElementById("f-r").value, company_type: document.getElementById("f-t").value, job_url: document.getElementById("f-u").value, follow_up: document.getElementById("f-d").value, contact: document.getElementById("f-p").value, notes: document.getElementById("f-n").value });
      APPS.unshift(a); document.getElementById("form").innerHTML = ""; board();
    } catch (e) { toast(e.message); }
  };
  window.delApp = async id => {
    if (!confirm("Delete this application?")) return;
    await api("/applications/" + id, "DELETE"); APPS = APPS.filter(a => a.id !== id); board();
  };
})();
