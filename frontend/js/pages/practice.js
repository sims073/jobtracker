(async () => {
  await renderNav("practice");
  const CATS = ["DSA", "OOP", "DBMS", "OS", "Networking", "SQL", "Aptitude"];
  let cat = "", queue = [], idx = 0, score = 0;
  drawPicker();

  function drawPicker() {
    document.getElementById("main").innerHTML = `
      <div class="card reveal in">
        <h3>Practice zone</h3>
        <p class="mu">Pick a category to start a quick round of questions.</p>
        <div class="row">${CATS.map(c => `<button class="ghost" onclick="start('${c}')">${c}</button>`).join("")}<button onclick="start('')">Mixed</button></div>
      </div>`;
  }
  window.start = async c => {
    cat = c; queue = await api("/practice/questions?category=" + encodeURIComponent(c) + "&limit=8"); idx = 0; score = 0;
    if (!queue.length) { toast("No questions in this category yet"); return; }
    drawQuestion();
  };
  function drawQuestion() {
    if (idx >= queue.length) {
      document.getElementById("main").innerHTML = `<div class="card reveal in pop"><h2>Round complete 🎉</h2><p>Score: ${score} / ${queue.length}</p><button onclick="start('${cat}')">Try again</button> <button class="ghost" onclick="location.reload()">Back to categories</button></div>`;
      confettiBurst();
      return;
    }
    const q = queue[idx];
    document.getElementById("main").innerHTML = `
      <div class="card reveal in">
        <p class="mu">${esc(q.category)} · ${esc(q.difficulty)} · Question ${idx + 1}/${queue.length}</p>
        <h3>${esc(q.prompt)}</h3>
        <div class="grid" style="gap:8px">${q.options.map((o, i) => `<button class="ghost" style="text-align:left" onclick="pick('${q.id}',${i})">${esc(o)}</button>`).join("")}</div>
        <div id="fb" style="margin-top:12px"></div>
      </div>`;
  }
  window.pick = async (qid, selected) => {
    document.querySelectorAll("#main button.ghost").forEach(b => (b.disabled = true));
    try {
      const r = await api("/practice/attempt", "POST", { question_id: qid, selected });
      if (r.correct) score++;
      document.getElementById("fb").innerHTML = `<p class="${r.correct ? "ok" : "bad"}">${r.correct ? "Correct!" : "Not quite."} ${r.xp_gained ? `+${r.xp_gained} XP` : ""}</p><p class="mu">${esc(r.explanation)}</p><button style="margin-top:8px" onclick="next()">Next</button>`;
    } catch (e) { toast(e.message); }
  };
  window.next = () => { idx++; drawQuestion(); };
})();
