(async () => {
  await renderAdminNav("index");
  const s = await api("/admin/stats");
  const bar = (label, v, mx) => `<div class="bar"><span>${esc(label)}</span><div><i data-w="${mx ? 100 * v / mx : 0}"></i></div><em>${v}</em></div>`;
  const maxStage = Math.max(1, ...Object.values(s.applications_by_stage));
  const maxRole = Math.max(1, ...Object.values(s.users_by_role));
  document.getElementById("main").innerHTML = `
    <div class="grid g3 reveal in">
      <div class="card"><div class="counter" data-count="${s.total_users}">0</div><p class="mu">Total users</p></div>
      <div class="card"><div class="counter" data-count="${s.active_users}">0</div><p class="mu">Active users</p></div>
      <div class="card"><div class="counter" data-count="${s.total_applications}">0</div><p class="mu">Applications tracked</p></div>
      <div class="card"><div class="counter" data-count="${s.companies}">0</div><p class="mu">Companies in guide</p></div>
      <div class="card"><div class="counter" data-count="${s.questions}">0</div><p class="mu">Practice questions</p></div>
    </div>
    <div class="row" style="margin-top:16px">
      <div class="card col reveal in">
        <h3>Applications by stage</h3>
        ${Object.entries(s.applications_by_stage).map(([k, v]) => bar(k, v, maxStage)).join("") || '<p class="mu">No applications tracked yet.</p>'}
      </div>
      <div class="card col reveal in">
        <h3>Users by target role</h3>
        ${Object.entries(s.users_by_role).map(([k, v]) => bar(k || "Not set", v, maxRole)).join("") || '<p class="mu">No users yet.</p>'}
      </div>
    </div>`;
  runReveal(); animateCounters();
  requestAnimationFrame(() => document.querySelectorAll("[data-w]").forEach(el => (el.style.width = el.dataset.w + "%")));
})();
