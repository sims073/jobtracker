const API = "/api";

function token() { return localStorage.getItem("dt_token"); }
function setToken(t) { localStorage.setItem("dt_token", t); }
function clearToken() { localStorage.removeItem("dt_token"); }

async function api(path, method = "GET", body) {
  const t = token();
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (res.status === 401) {
    clearToken();
    location.href = "/login.html";
    throw new Error("Please log in again");
  }
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Something went wrong");
  return data;
}
