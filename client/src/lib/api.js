import { clearSession, getToken } from "./auth";

class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Build absolute URL when VITE_API_URL exists, otherwise fall back to relative (local dev proxy)
const buildUrl = (path) => {
  const clean = path?.startsWith("/") ? path : `/${path || ""}`;
  if (!API_BASE) return clean;
  return `${API_BASE}${clean}`;
};

const readErrorMessage = (payload) => {
  if (!payload) return "Request failed";
  if (payload.error?.message) return payload.error.message;
  if (payload.message) return payload.message;
  return "Request failed";
};

export const apiRequest = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const hadAuth = Boolean(token);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  // handle empty responses safely
  const payload = await response.json().catch(() => null);

  if (response.status === 401) {
    if (hadAuth) clearSession();
    throw new UnauthorizedError(readErrorMessage(payload));
  }

  if (!response.ok) {
    const err = new Error(readErrorMessage(payload));
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  // your API seems to return { data: ... }
  return payload?.data ?? payload;
};

export const isUnauthorizedError = (error) =>
  error?.name === "UnauthorizedError";
