/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../context/CategoriesContext";
import { apiRequest } from "../../services/api";
import "./student-profile-page.styles.scss";

const actionCategoryTypeMap = {
  incident: "behaviour",
  detention: "behaviour",
  reward: "reward",
};

const ACTIONS = [
  { key: "incident", label: "Incident" },
  { key: "reward", label: "Reward" },
  { key: "note", label: "Note" },
  { key: "detention", label: "Detention" },
];

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "incidents", label: "Incidents" },
  { key: "rewards", label: "Rewards" },
  { key: "detentions", label: "Detentions" },
  { key: "notes", label: "Notes" },
];

const isWithinDays = (dateValue, days) => {
  if (!days) return true;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  return d >= cutoff;
};

const isToday = (dateValue) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const TeacherStudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const {
    ensureCategories,
    getActive,
    byId,
    error: categoryError,
  } = useCategories();

  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState({
    incidents: null,
    rewards: null,
    detentions: null,
    offsets: null,
    notes: [],
  });

  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // filters
  const [tab, setTab] = useState("all");
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("30"); // today | 7 | 30 | all

  // action launcher + modal
  const [actionDraft, setActionDraft] = useState("incident");
  const [openAction, setOpenAction] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        apiRequest({ path: `/api/students/${id}/profile`, token }),
        apiRequest({ path: `/api/students/${id}/timeline`, token }),
      ]);

      setProfile(p.data?.student || p.data);
      setTimeline((prev) => ({
        incidents: t.data?.incidents ?? prev.incidents,
        detentions: t.data?.detentions ?? prev.detentions,
        rewards: t.data?.rewards ?? prev.rewards,
        offsets: t.data?.offsets ?? prev.offsets,
        notes: Array.isArray(t.data?.notes) ? t.data.notes : prev.notes,
      }));
    } catch (err) {
      if (err.status === 403) return navigate("/teacher/students");
      setMessage(err.message);
    }
  }, [id, navigate, token]);

  useEffect(() => {
    load();
  }, [load]);

  // ensure categories for timeline label lookups + modals
  useEffect(() => {
    ensureCategories("behaviour").catch(() => null);
    ensureCategories("reward").catch(() => null);
  }, [ensureCategories]);

  const listFromTimelineKey = useCallback(
    (key) => {
      const val = timeline?.[key];
      const list = Array.isArray(val)
        ? val
        : Array.isArray(val?.items)
          ? val.items
          : [];
      return list;
    },
    [timeline],
  );

  const allItems = useMemo(() => {
    const incidents = listFromTimelineKey("incidents").map((x) => ({
      ...x,
      __type: "incident",
      __tab: "incidents",
    }));
    const rewards = listFromTimelineKey("rewards").map((x) => ({
      ...x,
      __type: "reward",
      __tab: "rewards",
    }));
    const detentions = listFromTimelineKey("detentions").map((x) => ({
      ...x,
      __type: "detention",
      __tab: "detentions",
    }));
    const notes = listFromTimelineKey("notes").map((x) => ({
      ...x,
      __type: "note",
      __tab: "notes",
    }));

    const combined = [...incidents, ...rewards, ...detentions, ...notes];

    return combined.sort(
      (a, b) =>
        new Date(b.createdAt || b.occurredAt) -
        new Date(a.createdAt || a.occurredAt),
    );
  }, [listFromTimelineKey]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const range = dateRange;

    return allItems.filter((i) => {
      const dateValue = i.createdAt || i.occurredAt || new Date().toISOString();

      if (tab !== "all" && i.__tab !== tab) return false;

      if (categoryFilterId) {
        if (String(i.categoryId || "") !== String(categoryFilterId))
          return false;
      }

      if (range === "today") {
        if (!isToday(dateValue)) return false;
      } else if (range !== "all") {
        const days = Number(range);
        if (Number.isFinite(days) && days > 0) {
          if (!isWithinDays(dateValue, days)) return false;
        }
      }

      if (!q) return true;

      const categoryName = i.categoryId ? byId[i.categoryId]?.name : "";
      const detailText = i.notes || i.text || i.status || i.reason || "";
      const hay = `${categoryName} ${detailText}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, tab, categoryFilterId, dateRange, searchTerm, byId]);

  const stats = useMemo(() => {
    const incidentsCount = listFromTimelineKey("incidents").length;
    const rewardsCount = listFromTimelineKey("rewards").length;
    const detentionsCount = listFromTimelineKey("detentions").length;

    const rewardMinutes = listFromTimelineKey("rewards").reduce(
      (sum, r) => sum + Number(r.minutesAwarded || 0),
      0,
    );
    const incidentMinutes = listFromTimelineKey("incidents").reduce(
      (sum, r) => sum + Number(r.minutesAssigned || 0),
      0,
    );
    const detentionMinutes = listFromTimelineKey("detentions").reduce(
      (sum, r) => sum + Number(r.minutesAssigned || 0),
      0,
    );

    const net = rewardMinutes - incidentMinutes - detentionMinutes;

    return {
      incidentsCount,
      rewardsCount,
      detentionsCount,
      rewardMinutes,
      incidentMinutes,
      detentionMinutes,
      netMinutes: net,
    };
  }, [listFromTimelineKey]);

  const modalCategoryType = actionCategoryTypeMap[openAction] || "";
  const modalBaseOptions = modalCategoryType
    ? getActive(modalCategoryType)
    : [];

  // ✅ show all categories, never disable (we just label “no detention rule”)
  const modalCategoryOptions = useMemo(() => {
    if (!openAction) return [];
    if (!modalCategoryType) return [];
    return modalBaseOptions;
  }, [openAction, modalCategoryType, modalBaseOptions]);

  const categoryFilterOptions = useMemo(() => {
    if (tab === "incidents" || tab === "detentions")
      return getActive("behaviour");
    if (tab === "rewards") return getActive("reward");
    if (tab === "notes") return [];
    return [...getActive("behaviour"), ...getActive("reward")].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || "")),
    );
  }, [tab, getActive]);

  // open modal -> preselect first category if available
  useEffect(() => {
    if (!openAction) {
      setSelectedCategoryId("");
      return;
    }

    setMessage("");

    if (!modalCategoryType) {
      setSelectedCategoryId("");
      return;
    }

    const first = modalCategoryOptions?.[0]?._id || "";
    setSelectedCategoryId(first);
  }, [openAction, modalCategoryType, modalCategoryOptions]);

  const handleAction = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      if (openAction === "note") {
        await apiRequest({
          path: "/api/notes",
          method: "POST",
          token,
          body: {
            entityType: "student",
            entityId: id,
            text: data.text || "",
          },
        });
        setOpenAction("");
        load();
        return;
      }

      if (openAction === "reward") {
        const cat = selectedCategoryId ? byId[selectedCategoryId] : null;
        const minutesAwarded = Number(cat?.rewardMinutes || 0);

        await apiRequest({
          path: "/api/rewards",
          method: "POST",
          token,
          body: {
            studentId: id,
            categoryId: selectedCategoryId,
            notes: data.notes || "",
            minutesAwarded,
          },
        });

        setOpenAction("");
        load();
        return;
      }

      if (openAction === "incident" || openAction === "detention") {
        // NOTE: detentions are created by behaviour rule on backend (if category triggers detention)
        await apiRequest({
          path: "/api/incidents",
          method: "POST",
          token,
          body: {
            studentId: id,
            categoryId: selectedCategoryId,
            notes: data.notes || "",
            occurredAt: new Date().toISOString(),
          },
        });

        setOpenAction("");
        load();
        return;
      }
    } catch (err) {
      setMessage(err.message);
    }
  };

  const categoryPreview = useMemo(() => {
    if (!openAction || !selectedCategoryId) return "";
    const cat = byId[selectedCategoryId];
    if (!cat) return "";

    if (openAction === "reward") {
      const mins = Number(cat.rewardMinutes || 0);
      return `Default reward: +${mins} minute${mins === 1 ? "" : "s"}`;
    }

    if (openAction === "incident" || openAction === "detention") {
      const det = Number(cat.detentionMinutes || 0);
      if (det > 0) {
        return `This behaviour triggers detention: ${det} minute${det === 1 ? "" : "s"}`;
      }
      return "This behaviour does not trigger detention.";
    }

    return "";
  }, [openAction, selectedCategoryId, byId]);

  const renderTimelineRow = (i) => {
    const categoryName = i.categoryId ? byId[i.categoryId]?.name : "";
    const detailText = i.notes || i.text || i.status || "";
    const dateValue = i.createdAt || i.occurredAt || new Date().toISOString();

    const minutes =
      i.__type === "reward"
        ? Number(i.minutesAwarded || 0)
        : Number(i.minutesAssigned || 0);

    const badge =
      i.__type === "reward" ? `+${minutes}m` : minutes ? `-${minutes}m` : "";

    const title = categoryName || (i.__type === "note" ? "Note" : "Record");

    return (
      <li key={i._id} className={`timeline-item timeline-item--${i.__type}`}>
        <div className="timeline-item__left">
          <div
            className={`timeline-item__icon timeline-item__icon--${i.__type}`}
          >
            {i.__type === "incident" ? "!" : null}
            {i.__type === "reward" ? "+" : null}
            {i.__type === "detention" ? "⏱" : null}
            {i.__type === "note" ? "📝" : null}
          </div>
        </div>

        <div className="timeline-item__content">
          <div className="timeline-item__top">
            <div className="timeline-item__title">{title}</div>
            {badge ? (
              <div
                className={`timeline-item__pill timeline-item__pill--${i.__type}`}
              >
                {badge}
              </div>
            ) : null}
          </div>

          {detailText ? (
            <div className="timeline-item__desc">{detailText}</div>
          ) : (
            <div className="timeline-item__desc timeline-item__desc--muted">
              No description
            </div>
          )}

          <div className="timeline-item__meta">
            <span>{new Date(dateValue).toLocaleString()}</span>
          </div>
        </div>
      </li>
    );
  };

  return (
    <section className="teacher-student-profile-page">
      <div className="student-shell">
        <header className="student-header">
          <div className="student-header__main">
            <div className="student-header__title">
              <h2 className="student-header__name">
                {profile
                  ? `${profile.firstName} ${profile.lastName}`
                  : "Loading student..."}
              </h2>
              <div className="student-header__chips">
                <span className="chip chip--muted">
                  Year {profile?.yearGroup ?? "—"}
                </span>
                <span className="chip chip--muted">
                  Form {profile?.form ?? "—"}
                </span>
                <span
                  className={`chip ${profile?.status === "inactive" ? "chip--danger" : "chip--success"}`}
                >
                  {profile?.status ? profile.status.toUpperCase() : "—"}
                </span>
              </div>
            </div>

            <div className="student-header__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setIsEditing((v) => !v)}
              >
                {isEditing ? "Close Edit" : "Edit Student"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate("/teacher/students")}
              >
                Back
              </button>
            </div>
          </div>

          <div className="student-stats">
            <div className="stat-card">
              <div className="stat-card__label">Incidents</div>
              <div className="stat-card__value">{stats.incidentsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Rewards</div>
              <div className="stat-card__value">{stats.rewardsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Detentions</div>
              <div className="stat-card__value">{stats.detentionsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Net Minutes</div>
              <div
                className={`stat-card__value ${stats.netMinutes >= 0 ? "stat-card__value--pos" : "stat-card__value--neg"}`}
              >
                {stats.netMinutes}
              </div>
            </div>
          </div>

          {isEditing && profile ? (
            <div className="student-edit">
              <form
                className="student-edit__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const body = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  apiRequest({
                    path: `/api/students/${id}`,
                    method: "PUT",
                    token,
                    body,
                  })
                    .then(() => {
                      setMessage("Profile Updated");
                      load();
                      setIsEditing(false);
                    })
                    .catch((err) => setMessage(err.message));
                }}
              >
                <div className="form-grid">
                  <label className="field">
                    <span className="field__label">First Name</span>
                    <input
                      defaultValue={profile.firstName}
                      name="firstName"
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Last Name</span>
                    <input
                      defaultValue={profile.lastName}
                      name="lastName"
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Year Group</span>
                    <input
                      defaultValue={profile.yearGroup}
                      name="yearGroup"
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Form</span>
                    <input defaultValue={profile.form} name="form" required />
                  </label>

                  <label className="field">
                    <span className="field__label">Status</span>
                    <select defaultValue={profile.status} name="status">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>

                <div className="student-edit__footer">
                  <button type="submit" className="btn btn--primary">
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </header>

        <section className="action-launcher">
          <div className="action-launcher__left">
            <div className="segmented">
              {ACTIONS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={`segmented__btn ${actionDraft === a.key ? "segmented__btn--active" : ""}`}
                  onClick={() => setActionDraft(a.key)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="action-launcher__hint">
              {actionDraft === "detention"
                ? "Detentions are created via behaviour rules (category detention minutes)."
                : "Log actions quickly with category-based defaults."}
            </div>
          </div>

          <div className="action-launcher__right">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setOpenAction(actionDraft)}
            >
              Log Action
            </button>
          </div>
        </section>

        <section className="student-body">
          <aside className="filters">
            <div className="filters__block">
              <div className="filters__title">Timeline</div>
              <div className="tabs">
                {FILTER_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`tabs__btn ${tab === t.key ? "tabs__btn--active" : ""}`}
                    onClick={() => {
                      setTab(t.key);
                      setCategoryFilterId("");
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filters__block">
              <div className="filters__label">Search</div>
              <input
                className="filters__input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes / categories..."
              />
            </div>

            <div className="filters__block">
              <div className="filters__label">Date Range</div>
              <select
                className="filters__select"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div className="filters__block">
              <div className="filters__label">Category</div>
              <select
                className="filters__select"
                value={categoryFilterId}
                onChange={(e) => setCategoryFilterId(e.target.value)}
                disabled={tab === "notes"}
              >
                <option value="">All categories</option>
                {categoryFilterOptions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {tab === "notes" ? (
                <div className="filters__hint">
                  Notes do not use categories.
                </div>
              ) : null}
            </div>

            {categoryError ? (
              <div className="filters__error">{categoryError}</div>
            ) : null}
          </aside>

          <main className="timeline">
            {message ? <div className="page-message">{message}</div> : null}

            <div className="timeline__header">
              <div className="timeline__title">
                Activity
                <span className="timeline__count">{filteredItems.length}</span>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setSearchTerm("");
                  setDateRange("30");
                  setCategoryFilterId("");
                  setTab("all");
                }}
              >
                Reset filters
              </button>
            </div>

            <ul className="timeline__list">
              {filteredItems.map(renderTimelineRow)}
              {!filteredItems.length ? (
                <li className="timeline__empty">
                  No records found for these filters.
                </li>
              ) : null}
            </ul>
          </main>
        </section>
      </div>

      {openAction ? (
        <Modal onClose={() => setOpenAction("")} title={`Log ${openAction}`}>
          <form className="action-modal" onSubmit={handleAction}>
            <div className="action-modal__student">
              <div className="action-modal__studentName">
                {profile
                  ? `${profile.firstName} ${profile.lastName}`
                  : "Student"}
              </div>
              <div className="action-modal__studentMeta">
                Year {profile?.yearGroup ?? "—"} • Form {profile?.form ?? "—"}
              </div>
            </div>

            {openAction !== "note" ? (
              <label className="field">
                <span className="field__label">Category</span>
                <select
                  name="categoryId"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  required
                >
                  <option value="">Select category...</option>
                  {modalCategoryOptions.map((category) => {
                    const detMins = Number(category?.detentionMinutes || 0);

                    return (
                      <option key={category._id} value={category._id}>
                        {category.name}
                        {openAction === "detention" && detMins <= 0
                          ? " (no detention rule)"
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : null}

            {categoryPreview ? (
              <div className="action-modal__preview">{categoryPreview}</div>
            ) : null}

            <label className="field">
              <span className="field__label">
                {openAction === "note" ? "Note" : "Description"}
                <span className="field__optional">optional</span>
              </span>
              <textarea
                name={openAction === "note" ? "text" : "notes"}
                placeholder={
                  openAction === "note" ? "Add a note..." : "Add details..."
                }
              />
            </label>

            <div className="action-modal__footer">
              <button type="submit" className="btn btn--primary">
                Confirm
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setOpenAction("")}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
};

export default TeacherStudentProfilePage;
