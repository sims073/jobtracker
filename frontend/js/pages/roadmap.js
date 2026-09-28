(async () => {
  await renderNav("roadmap");
  const meta = await api("/guide/meta");
  await load(ME.target_role || meta.roles[0]);

  async function load(role) {
    const [rm, pr] = await Promise.all([api("/guide/roadmap/" + encodeURIComponent(role)), api("/practice/progress/" + encodeURIComponent(role))]);
    const done = new Set(pr.completed_topic_ids);
    document.getElementById("main").innerHTML = `
      <div class="card reveal in">
        <div class="row" style="align-items:center;justify-content:space-between">
          <h3 style="margin:0">Roadmap</h3>
          <select onchange="load(this.value)">${opts(meta.roles, role)}</select>
        </div>
        <p class="mu">${done.size} / ${rm.topics.length} topics completed</p>
        <div class="roadmap">${rm.topics.map(t => `
          <div class="topic ${done.has(t.id) ? "done" : ""}">
            <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer">
              <input type="checkbox" ${done.has(t.id) ? "checked" : ""} onchange="toggle('${t.id}',this.checked,'${role}')" style="margin-top:4px">
              <span><h5>${esc(t.title)}</h5><span class="mu">${t.resources.map(esc).join(" · ")}</span></span>
            </label>
          </div>`).join("") || '<p class="mu">No roadmap yet for this role.</p>'}</div>
      </div>`;
  }
  window.load = load;
  window.toggle = async (id, done, role) => {
    try {
      const r = await api("/practice/progress/" + encodeURIComponent(role), "POST", { topic_id: id, done });
      if (done) { toast(r.xp_gained ? `+${r.xp_gained} XP` : "Marked done"); confettiBurst(); }
      await load(role);
    } catch (e) { toast(e.message); }
  };
})();
