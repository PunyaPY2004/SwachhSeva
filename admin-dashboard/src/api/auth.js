import api from "./client";

const TOKEN_KEY = "swachhseva_admin_token";

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  if (!["officer", "admin"].includes(data.user.role)) {
    throw new Error("This console is for officers and admins only.");
  }
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return !!localStorage.getItem(TOKEN_KEY);
}
