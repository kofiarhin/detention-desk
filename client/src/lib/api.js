import { clearSession, getToken } from "./auth";

class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
    this.payload = { message };
  }
}

// Use env if you want (optional). If empty, Vercel rewrites + Vite proxy will handle /api.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const ensureApiPrefix = (path = "") => {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean.startsWith("/api/") ? clean : `/api${clean}`;
};

const buildUrl = (path = "") => {
  const apiPath = ensureApiPrefix(path);
  return API_BASE ? `${API_BASE}${apiPath}` : apiPath;
};

const readErrorMessage = (payload) => {
  if (!payload) return "Request failed";
  if (payload.error?.message) return payload.error.message;
  if (payload.message) return payload.message;
  return "Request failed";
};

// ✅ Object signature (matches your services/pages)
export const apiRequest = async ({
  path,
  method = "GET",
  token,
  body,
  headers = {},
} = {}) => {
  const authToken = token || getToken();

  const finalHeaders = {
    ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...headers,
  };

  const hadAuth = Boolean(authToken);

  if (authToken) finalHeaders.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: finalHeaders,
      ...(body !== undefined
        ? { body: body instanceof FormData ? body : JSON.stringify(body) }
        : {}),
    });
  } catch {
    const err = new Error(
      "Network error. Check backend uptime / CORS / rewrites.",
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

  return payload?.data ?? payload;
};

export const isUnauthorizedError = (error) =>
  error?.name === "UnauthorizedError";
