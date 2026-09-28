function requireLogin() {
  if (!token()) location.href = "/login.html";
}
function logout() {
  clearToken();
  location.href = "/login.html";
}
