import api from "./api";

export async function fetchCitizenLeaderboard(limit = 10) {
  const { data } = await api.get("/leaderboard/citizens", { params: { limit } });
  return data;
}

export async function fetchMyEngagement() {
  const { data } = await api.get("/leaderboard/me");
  return data;
}
