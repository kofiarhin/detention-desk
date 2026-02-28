import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../context/CategoriesContext";
import { apiRequest } from "../../services/api";
import "./categories-manager.styles.scss";

const CategoriesManager = () => {
  const { token, role } = useAuth();
  const { ensureCategories, refreshCategories, loading, error, getAll } = useCategories();
  const [activeTab, setActiveTab] = useState("behaviour");
  const [formState, setFormState] = useState({
    name: "",
    sortOrder: 0,
    detentionMinutes: "",
    rewardMinutes: "",
  });
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = role === "schoolAdmin";
  const currentItems = getAll(activeTab);

  useEffect(() => {
    ensureCategories(activeTab).catch(() => null);
  }, [activeTab, ensureCategories]);

  const resetForm = () => {
    setFormState({ name: "", sortOrder: 0, detentionMinutes: "", rewardMinutes: "" });
    setEditingId("");
  };

  const categoryPayload = useMemo(() => {
    const base = {
      type: activeTab,
      name: formState.name.trim(),
      sortOrder: Number(formState.sortOrder || 0),
    };

    if (activeTab === "behaviour") {
      base.detentionMinutes =
        formState.detentionMinutes === "" ? null : Number(formState.detentionMinutes);
    } else {
      base.rewardMinutes =
        formState.rewardMinutes === "" ? null : Number(formState.rewardMinutes);
    }

    return base;
  }, [activeTab, formState]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!isAdmin || !formState.name.trim()) return;

    setSaving(true);
    setMessage("");

    try {
      if (editingId) {
        await apiRequest({
          path: `/categories/${editingId}`,
          method: "PUT",
          token,
          body: categoryPayload,
        });
        setMessage("Category updated");
      } else {
        await apiRequest({
          path: "/categories",
          method: "POST",
          token,
          body: categoryPayload,
        });
        setMessage("Category created");
      }
      resetForm();
      await refreshCategories(activeTab);
    } catch (requestError) {
      setMessage(requestError.message || "Unable to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormState({
      name: item.name || "",
      sortOrder: Number(item.sortOrder || 0),
      detentionMinutes:
        activeTab === "behaviour" && item.detentionMinutes >= 0 ? item.detentionMinutes : "",
      rewardMinutes:
        activeTab === "reward" && item.rewardMinutes >= 0 ? item.rewardMinutes : "",
    });
  };

  const handleToggle = async (id) => {
    if (!isAdmin) return;
    setSaving(true);
    setMessage("");
    try {
      await apiRequest({
        path: `/categories/${id}/toggle`,
        method: "PATCH",
        token,
      });
      await refreshCategories(activeTab);
    } catch (requestError) {
      setMessage(requestError.message || "Unable to toggle category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="categories-manager">
      <div className="categories-manager__tabs">
        <button
          className={activeTab === "behaviour" ? "active" : ""}
          onClick={() => {
            setActiveTab("behaviour");
            resetForm();
          }}
          type="button"
        >
          Behaviour
        </button>
        <button
          className={activeTab === "reward" ? "active" : ""}
          onClick={() => {
            setActiveTab("reward");
            resetForm();
          }}
          type="button"
        >
          Reward
        </button>
      </div>

      {!isAdmin ? (
        <p className="categories-manager__readonly">Only admins can manage categories.</p>
      ) : null}

      {error ? <p className="categories-manager__error">{error}</p> : null}
      {message ? <p className="categories-manager__message">{message}</p> : null}

      {loading[activeTab] ? <p>Loading categories...</p> : null}

      {!loading[activeTab] && !currentItems.length ? <p>No categories yet.</p> : null}

      <div className="categories-manager__table-wrap">
        <table className="categories-manager__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Sort</th>
              <th>Status</th>
              <th>{activeTab === "behaviour" ? "Detention Minutes" : "Reward Minutes"}</th>
              {isAdmin ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item) => (
              <tr key={item._id}>
                <td>{item.name}</td>
                <td>{item.sortOrder || 0}</td>
                <td>{item.isActive ? "Active" : "Inactive"}</td>
                <td>
                  {activeTab === "behaviour"
                    ? item.detentionMinutes ?? "-"
                    : item.rewardMinutes ?? "-"}
                </td>
                {isAdmin ? (
                  <td>
                    <button onClick={() => handleEdit(item)} type="button">
                      Edit
                    </button>
                    <button onClick={() => handleToggle(item._id)} type="button">
                      {item.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin ? (
        <form className="categories-manager__form" onSubmit={handleCreateOrUpdate}>
          <h4>{editingId ? "Update Category" : "Create Category"}</h4>
          <input
            name="name"
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            required
            value={formState.name}
          />
          <input
            min="0"
            name="sortOrder"
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, sortOrder: e.target.value }))
            }
            placeholder="Sort order"
            type="number"
            value={formState.sortOrder}
          />
          {activeTab === "behaviour" ? (
            <input
              min="0"
              name="detentionMinutes"
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, detentionMinutes: e.target.value }))
              }
              placeholder="Detention minutes"
              type="number"
              value={formState.detentionMinutes}
            />
          ) : (
            <input
              min="0"
              name="rewardMinutes"
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, rewardMinutes: e.target.value }))
              }
              placeholder="Reward minutes"
              type="number"
              value={formState.rewardMinutes}
            />
          )}

          <div className="categories-manager__form-actions">
            <button disabled={saving} type="submit">
              {editingId ? "Save Changes" : "Create Category"}
            </button>
            {editingId ? (
              <button onClick={resetForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
};

export default CategoriesManager;
