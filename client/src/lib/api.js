import { clearSession, getToken } from "./auth";

class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
    this.payload = { message };
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const buildUrl = (path = "") => {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${clean}` : clean;
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

  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path), { ...options, headers });
  } catch (e) {
    // Network/CORS failure => fetch rejects and there is no response/payload
    const err = new Error(
      "Network error. Check API URL / CORS / backend uptime.",
    );
    err.status = 0;
    err.payload = { message: err.message };
    throw err;
  }

  const payload = await response.json().catch(() => null);

  if (response.status === 401) {
    if (hadAuth) clearSession();
    throw new UnauthorizedError(readErrorMessage(payload));
  }

  if (!response.ok) {
    const err = new Error(readErrorMessage(payload));
    err.status = response.status;
    err.payload = payload || { message: err.message };
    throw err;
  }

  // support both { data: ... } and raw payload
  return payload?.data ?? payload;
};

export const isUnauthorizedError = (error) =>
  error?.name === "UnauthorizedError";
