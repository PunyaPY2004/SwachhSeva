import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../utils/config";

const TOKEN_KEY = "swachhseva_token";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach the JWT to every request automatically once the user is logged in.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error messages so screens can just read err.message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Something went wrong. Please try again.";
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.message === "Network Error") {
      message =
        "Can't reach the server. Check that the backend is running and that API_BASE_URL in utils/config.js matches your computer's IP address.";
    }
    return Promise.reject(new Error(message));
  }
);

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export default api;
