import { apiRequest } from "./api";

const ALLOWED_TYPES = new Set(["behaviour", "reward"]);

const cache = {
  behaviour: { token: "", items: null },
  reward: { token: "", items: null },
};

export const getCategories = async ({ token, type, includeInactive = false, force = false }) => {
  if (!ALLOWED_TYPES.has(type)) {
    throw new Error("Invalid category type");
  }

  if (
    !force &&
    cache[type].items &&
    cache[type].token === String(token || "") &&
    includeInactive === false
  ) {
    return cache[type].items;
  }

  const query = new URLSearchParams({ type });
  if (includeInactive) query.set("includeInactive", "true");

  const payload = await apiRequest({
    path: `/categories?${query.toString()}`,
    token,
  });

  const items = Array.isArray(payload?.data) ? payload.data : [];

  if (!includeInactive) {
    cache[type] = { token: String(token || ""), items };
  }

  return items;
};

export const clearCategoriesCache = () => {
  cache.behaviour = { token: "", items: null };
  cache.reward = { token: "", items: null };
};
