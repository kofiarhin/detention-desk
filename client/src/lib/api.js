import { clearSession, getToken } from "./auth";

const UnauthorizedError = class extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
};

const readErrorMessage = (payload) => {
  if (!payload) return "Request failed";
  if (payload.error?.message) return payload.error.message;
  if (payload.message) return payload.message;
  return "Request failed";
};

// Only clear session on 401 if the request actually included auth.
// This prevents public/unauth requests (or base URL issues) from wiping a valid session.
export const apiRequest = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const hadAuth =
    Boolean(token) && (headers.Authorization || headers.authorization || true); // token exists means we intend auth

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401) {
    if (hadAuth) clearSession();
    throw new UnauthorizedError(readErrorMessage(payload));
  }

  if (!response.ok) {
    const err = new Error(readErrorMessage(payload));
    err.status = response.status;
    throw err;
  }

  return payload?.data;
};

export const isUnauthorizedError = (error) =>
  error?.name === "UnauthorizedError";
