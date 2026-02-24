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

const TeacherStudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { ensureCategories, getActive, byId, error: categoryError } = useCategories();
  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState({
    incidents: null,
    rewards: null,
    detentions: null,
    offsets: null,
    notes: [],
  });
  const [tab, setTab] = useState("incidents");
  const [openAction, setOpenAction] = useState("");
  const [message, setMessage] = useState("");

  const categoryType = actionCategoryTypeMap[openAction] || "";
  const categoryOptions = categoryType ? getActive(categoryType) : [];

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

  useEffect(() => {
    if (!categoryType) return;
    ensureCategories(categoryType).catch(() => null);
  }, [categoryType, ensureCategories]);

  const items = useMemo(() => {
    const val = timeline?.[tab];
    const list = Array.isArray(val)
      ? val
      : Array.isArray(val?.items)
        ? val.items
        : [];
    return [...list].sort(
      (a, b) =>
        new Date(b.createdAt || b.occurredAt) -
        new Date(a.createdAt || a.occurredAt),
    );
  }, [timeline, tab]);

  const handleAction = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const routes = {
        incident: {
          p: "/api/incidents",
          b: {
            ...data,
            studentId: id,
            minutesAssigned: Number(data.minutesAssigned || 0),
          },
        },
        reward: {
          p: "/api/rewards",
          b: {
            ...data,
            studentId: id,
            minutesAwarded: Number(data.minutesAwarded || 0),
          },
        },
        note: {
          p: "/api/notes",
          b: { entityType: "student", entityId: id, text: data.text },
        },
        detention: {
          p: "/api/incidents",
          b: {
            ...data,
            studentId: id,
            minutesAssigned: Number(data.minutesAssigned || 30),
          },
        },
      };
      await apiRequest({
        path: routes[openAction].p,
        method: "POST",
        token,
        body: routes[openAction].b,
      });
      setOpenAction("");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="teacher-student-profile-page">
      <div className="profile-card">
        {profile ? (
          <>
            <h2>
              {profile.firstName} {profile.lastName}
            </h2>
            <form
              className="teacher-edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                const body = Object.fromEntries(new FormData(e.currentTarget));
                apiRequest({
                  path: `/api/students/${id}`,
                  method: "PUT",
                  token,
                  body,
                }).then(() => {
                  setMessage("Profile Updated");
                  load();
                });
              }}
            >
              <input
                defaultValue={profile.firstName}
                name="firstName"
                placeholder="First Name"
                required
              />
              <input
                defaultValue={profile.lastName}
                name="lastName"
                placeholder="Last Name"
                required
              />
              <input
                defaultValue={profile.yearGroup}
                name="yearGroup"
                placeholder="Year"
                required
              />
              <input
                defaultValue={profile.form}
                name="form"
                placeholder="Form"
                required
              />
              <select defaultValue={profile.status} name="status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button type="submit" className="form-submit">
                Save Changes
              </button>
            </form>
          </>
        ) : (
          <p>Initializing profile...</p>
        )}
      </div>

      {message && <p>{message}</p>}

      <nav className="tabs-nav">
        {["incidents", "rewards", "detentions", "notes"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <div className="timeline-container">
        <ul className="timeline-list">
          {items.map((i) => {
            const categoryName = i.categoryId ? byId[i.categoryId]?.name : "";
            const detailText = i.notes || i.text || i.status || "";
            const displayText = categoryName
              ? `${categoryName}${detailText ? ` - ${detailText}` : ""}`
              : detailText || "Record";

            return (
              <li key={i._id}>
                <div className="item-info">
                  <span>{displayText}</span>
                  <small>
                    {new Date(i.createdAt || i.occurredAt).toLocaleDateString()}
                  </small>
                </div>
                {i.minutesAssigned ? (
                  <div className="badge">-{i.minutesAssigned}m</div>
                ) : null}
              </li>
            );
          })}
          {!items.length && (
            <p style={{ textAlign: "center", color: "#64748b" }}>
              No records found.
            </p>
          )}
        </ul>
      </div>

      <div className="action-grid">
        <button onClick={() => setOpenAction("incident")}>Log Incident</button>
        <button onClick={() => setOpenAction("reward")}>Log Reward</button>
        <button onClick={() => setOpenAction("note")}>Add Note</button>
        <button onClick={() => setOpenAction("detention")}>Issue Detention</button>
      </div>

      {openAction && (
        <Modal onClose={() => setOpenAction("")} title={`New ${openAction}`}>
          <form className="teacher-edit-form" onSubmit={handleAction}>
            {categoryType ? (
              <select name="categoryId" defaultValue="" required>
                <option value="">Select category...</option>
                {categoryOptions.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            ) : null}

            <textarea
              name={openAction === "note" ? "text" : "notes"}
              placeholder="Description..."
              required
              style={{
                gridColumn: "span 2",
                minHeight: "120px",
                background: "#030712",
                color: "#fff",
                padding: "1rem",
                borderRadius: "10px",
                border: "1px solid #374151",
              }}
            />
            {["incident", "reward", "detention"].includes(openAction) && (
              <input
                name={
                  openAction === "reward" ? "minutesAwarded" : "minutesAssigned"
                }
                type="number"
                min="0"
                placeholder="Minutes"
              />
            )}
            {categoryError ? <p>{categoryError}</p> : null}
            <button type="submit" className="form-submit">
              Confirm Action
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default TeacherStudentProfilePage;
