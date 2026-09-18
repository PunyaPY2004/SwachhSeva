import api from "./client";

export async function fetchComplaints(filters = {}) {
  const params = {};
  if (filters.status && filters.status !== "ALL") params.status = filters.status;
  if (filters.department) params.department = filters.department;
  if (filters.issue_type) params.issue_type = filters.issue_type;
  if (filters.sort) params.sort = filters.sort;
  const { data } = await api.get("/admin/complaints", { params });
  return data;
}

export async function fetchComplaint(id) {
  const { data } = await api.get(`/admin/complaints/${id}`);
  return data;
}

export async function fetchStats() {
  const { data } = await api.get("/admin/stats");
  return data;
}

export async function fetchHeatmap() {
  const { data } = await api.get("/admin/heatmap");
  return data;
}

export async function updateStatus(id, payload) {
  const { data } = await api.put(`/admin/complaints/${id}/status`, payload);
  return data;
}

export async function resolveComplaint(id, { file, remarks }) {
  const formData = new FormData();
  formData.append("resolution_photo", file);
  if (remarks) formData.append("remarks", remarks);
  const { data } = await api.post(`/admin/complaints/${id}/resolve`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchOfficerStats() {
  const { data } = await api.get("/admin/officers/stats");
  return data;
}

export async function fetchOfficers() {
  const { data } = await api.get("/admin/officers");
  return data;
}

export async function fetchCitizenLeaderboard(limit = 5) {
  const { data } = await api.get("/leaderboard/citizens", { params: { limit } });
  return data;
}

export async function fetchHotspots({ minSize, radius } = {}) {
  const params = {};
  if (minSize) params.min_size = minSize;
  if (radius) params.radius = radius;
  const { data } = await api.get("/admin/hotspots", { params });
  return data;
}

export async function downloadExport(format, { start, end } = {}) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;

  const response = await api.get(`/admin/export/${format}`, {
    params,
    responseType: "blob",
  });

  // Pull the filename the backend suggested, falling back to a sensible default.
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename=([^;]+)/);
  const filename = match ? match[1].trim() : `swachhseva_export.${format}`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
