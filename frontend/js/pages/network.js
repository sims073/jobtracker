(async () => {
  await renderNav("network");
  let query = "";
  await drawAll();

  function connBtn(p) {
    if (p.status === "connected") return `<button class="ghost" onclick="openChat('${p.id}','${esc(p.name)}')">Message</button>`;
    if (p.status === "sent") return `<span class="mu">Requested</span>`;
    if (p.status === "received") return `<button onclick="respond('${p.conn_id}',true)">Accept</button>`;
    return `<button onclick="connect('${p.id}')">Connect</button>`;
  }
  const personRow = p => `<div class="person">${avatarHTML(p, "sm")}<a onclick="show('${p.id}')">${esc(p.name)}</a><span class="mu">@${esc(p.username || "")}</span><span class="mu">${esc(p.headline || p.target_role || "")}</span>${connBtn(p)}</div>`;

  async function drawAll() {
    const [c, results] = await Promise.all([api("/connections"), api("/users?q=" + encodeURIComponent(query))]);
    document.getElementById("main").innerHTML = `
      <div class="row">
        <div class="card col reveal in">
          <h3>Find people</h3>
          <div class="row" style="margin-bottom:10px"><input id="q" placeholder="Name, @username, role or headline" value="${esc(query)}" style="flex:1" onkeydown="if(event.key==='Enter')search()"><button onclick="search()">Search</button></div>
          <div id="results">${results.map(personRow).join("") || '<p class="mu">No matching people found.</p>'}</div>
        </div>
        <div class="card col reveal in">
          <h3>Requests (${c.incoming.length})</h3>
          ${c.incoming.map(p => `<div class="person">${avatarHTML(p, "sm")}${esc(p.name)}<span class="mu">${esc(p.headline || p.target_role || "")}</span><button onclick="respond('${p.conn_id}',true)">Accept</button><button class="ghost" onclick="respond('${p.conn_id}',false)">Ignore</button></div>`).join("") || '<p class="mu">No pending requests.</p>'}
          <h3 style="margin-top:16px">My connections (${c.friends.length})</h3>
          ${c.friends.map(p => `<div class="person">${avatarHTML(p, "sm")}${esc(p.name)}<span class="mu">${esc(p.headline || p.target_role || "")}</span><button class="ghost" onclick="openChat('${p.id}','${esc(p.name)}')">Message</button><button class="ghost" onclick="removeConn('${p.conn_id}')">Remove</button></div>`).join("") || '<p class="mu">No connections yet — search for people to connect with.</p>'}
          ${c.sent.length ? `<h3 style="margin-top:16px">Sent (${c.sent.length})</h3>${c.sent.map(p => `<div class="person">${avatarHTML(p, "sm")}${esc(p.name)}<span class="mu">Requested</span><button class="ghost" onclick="cancelReq('${p.conn_id}')">Cancel</button></div>`).join("")}` : ""}
        </div>
      </div>
      <div id="chatBox"></div>`;
  }
  window.search = async () => { query = document.getElementById("q").value; await drawAll(); };
  window.connect = async id => { try { await api("/connections/" + id, "POST"); toast("Request sent"); await drawAll(); } catch (e) { toast(e.message); } };
  window.respond = async (cid, accept) => { await api("/connections/" + cid + "/respond", "POST", { accept }); await drawAll(); };
  window.cancelReq = async cid => { try { await api("/connections/" + cid, "DELETE"); toast("Request cancelled"); await drawAll(); } catch (e) { toast(e.message); } };
  window.removeConn = async cid => {
    if (!confirm("Remove this connection?")) return;
    try { await api("/connections/" + cid, "DELETE"); closeChat(); toast("Connection removed"); await drawAll(); } catch (e) { toast(e.message); }
  };
  window.show = id => location.href = "/app/profile.html?id=" + id;

  let poll = null;
  window.openChat = async (id, name) => {
    clearInterval(poll);
    async function draw() {
      const msgs = await api("/connections/" + id + "/messages");
      const box = document.getElementById("chatBox");
      const wasAtBottom = box.querySelector(".msgs") ? box.querySelector(".msgs").scrollTop + box.querySelector(".msgs").clientHeight >= box.querySelector(".msgs").scrollHeight - 20 : true;
      box.innerHTML = `<div class="card reveal in" style="margin-top:16px">
        <div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Chat with ${esc(name)}</h3><a onclick="closeChat()">Close</a></div>
        <div class="msgs" style="max-height:280px;overflow-y:auto;margin:10px 0;display:flex;flex-direction:column;gap:6px">
          ${msgs.map(m => `<div style="align-self:${m.from_id === ME.id ? "flex-end" : "flex-start"};background:${m.from_id === ME.id ? "var(--ac)" : "var(--card2)"};color:${m.from_id === ME.id ? "#fff" : "var(--ink)"};padding:6px 12px;border-radius:12px;max-width:75%">${esc(m.text)}</div>`).join("") || '<p class="mu">Say hello 👋</p>'}
        </div>
        <div class="row"><input id="msgIn" placeholder="Type a message" style="flex:1" onkeydown="if(event.key==='Enter')sendMsg('${id}')"><button onclick="sendMsg('${id}')">Send</button></div>
      </div>`;
      if (wasAtBottom) { const m = box.querySelector(".msgs"); m.scrollTop = m.scrollHeight; }
    }
    await draw();
    poll = setInterval(draw, 4000);
    window._chatDraw = draw;
  };
  window.sendMsg = async id => {
    const el = document.getElementById("msgIn");
    if (!el.value.trim()) return;
    const text = el.value; el.value = "";
    try { await api("/connections/" + id + "/messages", "POST", { text }); await window._chatDraw(); }
    catch (e) { toast(e.message); }
  };
  window.closeChat = () => { clearInterval(poll); document.getElementById("chatBox").innerHTML = ""; };
  // opened from a profile's Message button: /app/network.html?chat=<user id>
  const chatId = new URLSearchParams(location.search).get("chat");
  if (chatId) {
    try {
      const f = (await api("/connections")).friends.find(x => x.id === chatId);
      if (f) await openChat(f.id, f.name); else toast("You are not connected with this user");
    } catch (e) { toast(e.message); }
  }
})();