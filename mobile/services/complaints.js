import api from "./api";
import { API_BASE_URL } from "../utils/config";

/**
 * Submits a new complaint.
 * `photo` is the object returned by expo-image-picker:
 *   { uri, mimeType/type, fileName }
 * `location` is { latitude, longitude }.
 */
export async function submitComplaint({ photo, location, description }) {
  const formData = new FormData();

  const filename = photo.fileName || photo.uri.split("/").pop();
  const match = /\.(\w+)$/.exec(filename || "");
  const ext = match ? match[1].toLowerCase() : "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  formData.append("image", {
    uri: photo.uri,
    name: filename || `complaint.${ext}`,
    type: mimeType,
  });
  formData.append("latitude", String(location.latitude));
  formData.append("longitude", String(location.longitude));
  if (description) {
    formData.append("description", description);
  }

  const { data } = await api.post("/complaints", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchMyComplaints() {
  const { data } = await api.get("/complaints");
  return data;
}

export async function fetchComplaintById(id) {
  const { data } = await api.get(`/complaints/${id}`);
  return data;
}

/**
 * Checks for existing open complaints near a location, before the citizen
 * finishes submitting a new one — lets them confirm an existing report
 * instead of creating a duplicate.
 */
export async function checkNearbyComplaints(location) {
  const { data } = await api.post("/complaints/check-nearby", {
    latitude: location.latitude,
    longitude: location.longitude,
  });
  return data;
}

export async function upvoteComplaint(id) {
  const { data } = await api.post(`/complaints/${id}/upvote`);
  return data;
}

export async function disputeComplaint(id, reason) {
  const { data } = await api.post(`/complaints/${id}/dispute`, { reason });
  return data;
}

export function imageUrl(relativePath) {
  if (!relativePath) return null;
  const serverRoot = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${serverRoot}/uploads/${relativePath}`;
}
