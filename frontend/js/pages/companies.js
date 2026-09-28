(async () => {
  await renderNav("companies");
  const meta = await api("/guide/meta");
  let all = await api("/guide/companies");
  draw();

  function draw(type = "") {
    const list = type ? all.filter(c => c.type === type) : all;
    document.getElementById("main").innerHTML = `
      <div class="row" style="margin-bottom:6px">
        <button class="${!type ? "" : "ghost"}" onclick="filt('')">All</button>
        ${meta.company_types.map(t => `<button class="${type === t ? "" : "ghost"}" onclick="filt('${t}')">${t}</button>`).join("")}
      </div>
      <div class="hrow">${list.map(c => `
        <div class="card reveal in">
          <div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">${esc(c.name)}</h3><span class="chip">${esc(c.type)}</span></div>
          <p class="mu">${esc(c.about)}</p>
          <p><b>Requirements</b></p><p class="mu">${c.requirements.map(esc).join(" · ")}</p>
          <p style="margin-top:8px"><b>Hiring stages</b></p>
          ${c.stages.map((s, i) => `<p style="margin:6px 0"><b>${i + 1}. ${esc(s.name)}</b><br><span class="mu">Tested: ${esc(s.what_tested)}</span><br><span class="mu">Tip: ${esc(s.tips)}</span></p>`).join("")}
        </div>`).join("") || '<p class="mu">No companies added yet.</p>'}</div>`;
  }
  window.filt = draw;
})();
