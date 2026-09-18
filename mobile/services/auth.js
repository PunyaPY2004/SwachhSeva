import api, { saveToken, clearToken } from "./api";

export async function registerCitizen({ name, email, phone, password }) {
  const { data } = await api.post("/auth/register", { name, email, phone, password });
  await saveToken(data.token);
  return data.user;
}

export async function login({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  await saveToken(data.token);
  return data.user;
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function logout() {
  await clearToken();
}
