(async () => {
  await renderNav("dashboard");
  const [meta, an] = await Promise.all([api("/guide/meta"), api("/guide/announcements").catch(() => [])]);
  await load(ME.target_role || meta.roles[0], meta);

  async function load(role, meta) {
    const d = await api("/analyzer?role=" + encodeURIComponent(role));
    const r = d.readiness, s = d.stats;
    const MAX = { skills: 55, roadmap: 25, activity: 10, response: 10 };
    const bar = (k, v, mx) => `<div class="bar"><span>${esc(k)}</span><div><i data-w="${mx ? (100 * v / mx) : 0}"></i></div><em>${v}</em></div>`;
    document.getElementById("main").innerHTML = `
      <div class="row">
        <div class="card col reveal in">
          <h3>Job readiness</h3>
          <select onchange="selRole(this.value)">${opts(meta.roles, d.role)}</select>
          <div class="ring" style="--p:0" id="ring"><span id="ringVal">0</span></div>
          <div id="bars">${bar("Skills", r.breakdown.skills, MAX.skills)}${bar("Roadmap", r.breakdown.roadmap, MAX.roadmap)}${bar("Activity", r.breakdown.activity, MAX.activity)}${bar("Response rate", r.breakdown.response, MAX.response)}</div>
          <h3 style="margin-top:16px">What to improve</h3>
          ${r.tips.map(t => `<p>• ${esc(t)}</p>`).join("") || '<p class="ok">You are in great shape for this role.</p>'}
        </div>
        <div class="card col reveal in">
          <h3>Application stats</h3>
          <p><b>${s.total}</b> applications · <b>${s.response_rate}%</b> response rate · <b>${s.funnel.Offer}</b> offers</p>
          ${Object.entries(s.funnel).map(([k, v]) => bar(k, v, s.total || 1)).join("")}
          ${an.length ? `<h3 style="margin-top:16px">Announcements</h3>${an.map(a => `<p><b>${esc(a.title)}</b><br><span class="mu">${esc(a.body)}</span></p>`).join("")}` : ""}
        </div>
      </div>`;
    requestAnimationFrame(() => {
      document.getElementById("ring").style.setProperty("--p", r.score);
      document.getElementById("ringVal").textContent = r.score;
      document.querySelectorAll("[data-w]").forEach(el => (el.style.width = el.dataset.w + "%"));
    });
  }
  window.selRole = role => load(role, meta);
})();
