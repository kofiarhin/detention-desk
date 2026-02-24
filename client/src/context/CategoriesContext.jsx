/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../services/api";

const CategoriesContext = createContext(null);

const sortCategories = (items) => {
  return [...items].sort((a, b) => {
    const sortA = Number.isFinite(a?.sortOrder) ? a.sortOrder : 0;
    const sortB = Number.isFinite(b?.sortOrder) ? b.sortOrder : 0;
    if (sortA !== sortB) return sortA - sortB;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
};

export const CategoriesProvider = ({ children }) => {
  const { token } = useAuth();
  const [categories, setCategories] = useState({ behaviour: [], reward: [] });
  const [loading, setLoading] = useState({ behaviour: false, reward: false });
  const [loaded, setLoaded] = useState({ behaviour: false, reward: false });
  const [error, setError] = useState("");

  const byId = useMemo(() => {
    const next = {};
    Object.values(categories)
      .flat()
      .forEach((item) => {
        if (item?._id) next[item._id] = item;
      });
    return next;
  }, [categories]);

  const fetchCategories = useCallback(
    async (type) => {
      if (!["behaviour", "reward"].includes(type)) return;

      setLoading((prev) => ({ ...prev, [type]: true }));
      setError("");

      try {
        const payload = await apiRequest({
          path: `/api/categories?type=${type}`,
          token,
        });
        const list = Array.isArray(payload?.data) ? payload.data : [];
        setCategories((prev) => ({ ...prev, [type]: list }));
        setLoaded((prev) => ({ ...prev, [type]: true }));
      } catch (requestError) {
        setError(requestError.message || "Unable to load categories");
        throw requestError;
      } finally {
        setLoading((prev) => ({ ...prev, [type]: false }));
      }
    },
    [token],
  );

  const ensureCategories = useCallback(
    async (type) => {
      if (!["behaviour", "reward"].includes(type)) return;
      if (loaded[type] || loading[type]) return;
      await fetchCategories(type);
    },
    [fetchCategories, loaded, loading],
  );

  const refreshCategories = useCallback(
    async (type) => {
      if (!["behaviour", "reward"].includes(type)) return;
      await fetchCategories(type);
    },
    [fetchCategories],
  );

  const getAll = useCallback(
    (type) => {
      if (!["behaviour", "reward"].includes(type)) return [];
      return sortCategories(categories[type] || []);
    },
    [categories],
  );

  const getActive = useCallback(
    (type) => {
      return getAll(type).filter((item) => item?.isActive === true);
    },
    [getAll],
  );

  const value = useMemo(
    () => ({
      categories,
      byId,
      loading,
      error,
      ensureCategories,
      refreshCategories,
      getActive,
      getAll,
    }),
    [categories, byId, loading, error, ensureCategories, refreshCategories, getActive, getAll],
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
};

export const useCategories = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within CategoriesProvider");
  }
  return context;
};
