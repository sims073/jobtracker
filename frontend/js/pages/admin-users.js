(async () => {
  await renderAdminNav("users");
  let q = "";
  await draw();

  async function draw() {
    const rows = await api("/admin/users?q=" + encodeURIComponent(q));
    document.getElementById("main").innerHTML = `
      <div class="card reveal in">
        <div class="row" style="margin-bottom:10px"><input id="q" placeholder="Search by name or email" value="${esc(q)}" style="flex:1" onkeydown="if(event.key==='Enter')search()"><button onclick="search()">Search</button></div>
        <div class="grid">${rows.map(u => `
          <div class="person">
            <b>${esc(u.name)}</b><span class="mu">${esc(u.email)}</span><span class="chip">${esc(u.role)}</span><span class="mu">${u.xp} XP</span>
            <span class="${u.is_active ? "ok" : "bad"}">${u.is_active ? "Active" : "Blocked"}</span>
            ${u.role !== "admin" ? `<button class="${u.is_active ? "danger" : ""}" onclick="toggle('${u.id}',${!u.is_active})">${u.is_active ? "Block" : "Unblock"}</button>` : ""}
          </div>`).join("") || '<p class="mu">No users found.</p>'}</div>
      </div>`;
  }
  window.search = async () => { q = document.getElementById("q").value; await draw(); };
  window.toggle = async (id, active) => {
    try { await api("/admin/users/" + id, "PUT", { is_active: active }); toast(active ? "User unblocked" : "User blocked"); await draw(); }
    catch (e) { toast(e.message); }
  };
})();
