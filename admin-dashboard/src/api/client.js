import axios from "axios";

/**
 * Set this in a ".env" file at the project root (copy .env.example):
 *   VITE_API_BASE_URL=http://192.168.0.195:5000/api
 * Use your computer's own address here (localhost is fine since this
 * dashboard runs in a browser on the same machine as the backend, unlike
 * the mobile app on a separate phone).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const SERVER_ROOT = API_BASE_URL.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("swachhseva_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Something went wrong. Please try again.";
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message === "Network Error") {
      message =
        "Can't reach the backend. Check that Flask is running and VITE_API_BASE_URL in .env is correct.";
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("swachhseva_admin_token");
    }
    return Promise.reject(new Error(message));
  }
);

export function imageUrl(relativePath) {
  if (!relativePath) return null;
  return `${SERVER_ROOT}/uploads/${relativePath}`;
}

export default api;
