const LV = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
(async () => {
  await renderNav("analyzer");
  const meta = await api("/guide/meta");
  await drawSkills(meta);
  document.getElementById("main").insertAdjacentHTML("beforeend", `
    <div class="card reveal in" style="margin-top:16px">
      <h3>Resume vs job description</h3>
      <p class="mu">Paste a job description. Your saved skills count automatically — paste your resume too for extra coverage.</p>
      <textarea id="jd" rows="5" placeholder="Paste the job description"></textarea>
      <textarea id="rs" rows="4" placeholder="Optional: paste your resume text" style="margin-top:8px"></textarea>
      <button style="margin-top:8px" onclick="doMatch()">Check match</button>
      <div id="mr" style="margin-top:12px"></div>
    </div>`);

  async function drawSkills(meta) {
    const l = await api("/skills");
    const have = Object.fromEntries(l.map(s => [s.name, s.level]));
    document.getElementById("main").innerHTML = `
      <div class="card reveal in">
        <h3>My skills</h3>
        <div class="row" style="align-items:center">
          <select id="s-n">${Object.entries(meta.skills).map(([c, a]) => `<optgroup label="${esc(c)}">${opts(a)}</optgroup>`).join("")}</select>
          <select id="s-l">${[1, 2, 3].map(i => `<option value="${i}">${LV[i]}</option>`).join("")}</select>
          <button onclick="addSkill()">Save skill</button>
        </div>
        <div style="margin-top:12px">${Object.entries(meta.skills).map(([cat, arr]) => `
          <p class="mu" style="margin:10px 0 2px">${esc(cat)}</p>
          ${arr.map(s => have[s] ? `<span class="chip">${esc(s)} <select onchange="setLv('${esc(s)}',this.value)">${[1, 2, 3].map(i => `<option value="${i}" ${have[s] == i ? "selected" : ""}>${LV[i]}</option>`).join("")}</select> <a onclick="delSkill('${esc(s)}')">✕</a></span>` : "").join("")}
        `).join("") || '<p class="mu">No skills yet — add some above to see your readiness score.</p>'}</div>
      </div>`;
  }
  window.addSkill = async () => {
    try { await api("/skills", "POST", { name: document.getElementById("s-n").value, level: +document.getElementById("s-l").value }); await drawSkills(meta); toast("Skill saved"); }
    catch (e) { toast(e.message); }
  };
  window.setLv = async (n, l) => { await api("/skills", "POST", { name: n, level: +l }); await drawSkills(meta); toast("Level updated"); };
  window.delSkill = async name => { await api("/skills/" + encodeURIComponent(name), "DELETE"); await drawSkills(meta); };
  window.doMatch = async () => {
    try {
      const r = await api("/analyzer/match", "POST", { jd: document.getElementById("jd").value, resume: document.getElementById("rs").value });
      document.getElementById("mr").innerHTML = `<h2>${r.percent}% match</h2><p class="ok">You have: ${r.matched.map(esc).join(", ") || "none"}</p><p class="bad">Missing: ${r.missing.map(esc).join(", ") || "nothing — full coverage"}</p>`;
    } catch (e) { toast(e.message); }
  };
})();
