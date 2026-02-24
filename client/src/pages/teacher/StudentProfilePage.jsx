/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./student-profile-page.styles.scss";

const toDatetimeLocal = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const toIsoFromDatetimeLocal = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const pickTimelineList = (val) => {
  if (Array.isArray(val)) return val;
  if (Array.isArray(val?.items)) return val.items;
  if (Array.isArray(val?.data)) return val.data;
  return [];
};

const unwrap = (payload) => {
  // supports: {data: ...} OR raw object/array OR null
  if (payload == null) return null;
  if (payload?.data !== undefined) return payload.data;
  return payload;
};

const StudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState({
    incidents: [],
    rewards: [],
    detentions: [],
    offsets: [],
    notes: [],
  });
  const [tab, setTab] = useState("incidents");

  const [policy, setPolicy] = useState(null);
  const [behaviourCategories, setBehaviourCategories] = useState([]);
  const [rewardCategories, setRewardCategories] = useState([]);

  const [openAction, setOpenAction] = useState("");
  const [message, setMessage] = useState("");

  const [actionForm, setActionForm] = useState({
    categoryId: "",
    notes: "",
    text: "",
    occurredAt: toDatetimeLocal(new Date()),
    awardedAt: toDatetimeLocal(new Date()),
  });

  const load = useCallback(async () => {
    try {
      setMessage("");

      const [p, t, pol, behaviourCats, rewardCats] = await Promise.all([
        apiRequest({ path: `/api/students/${id}/profile`, token }),
        apiRequest({ path: `/api/students/${id}/timeline`, token }),

        // backend routes are mounted WITHOUT /api
        apiRequest({ path: `/policy`, token }).catch(() => null),
        apiRequest({ path: `/categories?type=behaviour`, token }).catch(
          () => [],
        ),
        apiRequest({ path: `/categories?type=reward`, token }).catch(() => []),
      ]);

      const profilePayload = unwrap(p);
      setProfile(profilePayload?.student || profilePayload || null);

      const timelinePayload = unwrap(t) || t || {};
      setTimeline({
        incidents: pickTimelineList(timelinePayload?.incidents),
        rewards: pickTimelineList(timelinePayload?.rewards),
        detentions: pickTimelineList(timelinePayload?.detentions),
        offsets: pickTimelineList(timelinePayload?.offsets),
        notes: pickTimelineList(timelinePayload?.notes),
      });

      const policyPayload = unwrap(pol);
      setPolicy(policyPayload || null);

      const behaviourPayload = unwrap(behaviourCats);
      setBehaviourCategories(
        Array.isArray(behaviourPayload)
          ? behaviourPayload.filter((c) => c?.isActive !== false)
          : [],
      );

      const rewardPayload = unwrap(rewardCats);
      setRewardCategories(
        Array.isArray(rewardPayload)
          ? rewardPayload.filter((c) => c?.isActive !== false)
          : [],
      );
    } catch (err) {
      if (err?.status === 403) return navigate("/teacher/students");
      setMessage(err?.message || "Request failed");
    }
  }, [id, navigate, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const list = pickTimelineList(timeline?.[tab]);
    const dateKey = (i) =>
      i.createdAt || i.occurredAt || i.awardedAt || i.appliedAt;
    return [...list].sort(
      (a, b) => new Date(dateKey(b)) - new Date(dateKey(a)),
    );
  }, [timeline, tab]);

  const selectedCategory = useMemo(() => {
    const list =
      openAction === "reward"
        ? rewardCategories
        : openAction === "incident" || openAction === "detention"
          ? behaviourCategories
          : [];
    return (
      list.find((c) => String(c?._id) === String(actionForm.categoryId)) || null
    );
  }, [
    actionForm.categoryId,
    behaviourCategories,
    openAction,
    rewardCategories,
  ]);

  const detentionPreviewMinutes = useMemo(() => {
    if (!policy || !selectedCategory) return null;
    const explicit = Number(selectedCategory.detentionMinutes);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const fallback = Number(policy.defaultDetentionMinutes);
    return Number.isFinite(fallback) ? fallback : null;
  }, [policy, selectedCategory]);

  const rewardPreviewMinutes = useMemo(() => {
    if (!policy || !selectedCategory) return null;
    const explicit = Number(selectedCategory.rewardMinutes);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const fallback = Number(policy.rewardOffsetMinutes);
    return Number.isFinite(fallback) ? fallback : null;
  }, [policy, selectedCategory]);

  const openModal = (type) => {
    setMessage("");
    setOpenAction(type);
    setActionForm({
      categoryId: "",
      notes: "",
      text: "",
      occurredAt: toDatetimeLocal(new Date()),
      awardedAt: toDatetimeLocal(new Date()),
    });
  };

  const handleAction = async (e) => {
    e.preventDefault();

    try {
      const payloadByType = {
        incident: {
          path: "/api/incidents",
          body: {
            studentId: id,
            categoryId: actionForm.categoryId,
            notes: actionForm.notes,
            occurredAt: toIsoFromDatetimeLocal(actionForm.occurredAt),
          },
        },
        detention: {
          path: "/api/incidents",
          body: {
            studentId: id,
            categoryId: actionForm.categoryId,
            notes: actionForm.notes,
            occurredAt: toIsoFromDatetimeLocal(actionForm.occurredAt),
          },
        },
        reward: {
          path: "/api/rewards",
          body: {
            studentId: id,
            categoryId: actionForm.categoryId,
            notes: actionForm.notes,
            awardedAt: toIsoFromDatetimeLocal(actionForm.awardedAt),
          },
        },
        note: {
          path: "/api/notes",
          body: {
            entityType: "student",
            entityId: id,
            text: actionForm.text,
          },
        },
      };

      const config = payloadByType[openAction];
      if (!config) return;

      if (["incident", "detention", "reward"].includes(openAction)) {
        if (!config.body.categoryId)
          throw new Error("Please select a category");
      }
      if (["incident", "detention"].includes(openAction)) {
        if (!config.body.occurredAt)
          throw new Error("Please select a date/time");
      }
      if (openAction === "note") {
        if (!config.body.text?.trim()) throw new Error("Please enter a note");
      }

      await apiRequest({
        path: config.path,
        method: "POST",
        token,
        body: config.body,
      });

      setOpenAction("");
      void load();
    } catch (err) {
      setMessage(err?.message || "Request failed");
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
          </>
        ) : (
          <p>Initializing profile...</p>
        )}

        {message ? (
          <p style={{ marginTop: "0.75rem", color: "#93c5fd" }}>{message}</p>
        ) : null}
      </div>

      <nav className="tabs-nav">
        {["incidents", "rewards", "detentions", "notes"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            type="button"
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <div className="timeline-container">
        <ul className="timeline-list">
          {items.map((i) => {
            const date =
              i.createdAt || i.occurredAt || i.awardedAt || i.appliedAt;
            const minutes =
              i.minutesAssigned ??
              (Number.isFinite(i.minutesAwarded) ? -i.minutesAwarded : null) ??
              null;

            return (
              <li key={i._id}>
                <div className="item-info">
                  <span>{i.notes || i.text || i.status}</span>
                  <small>{date ? new Date(date).toLocaleString() : ""}</small>
                </div>
                {minutes !== null && minutes !== undefined ? (
                  <div className="badge">
                    {minutes < 0 ? "+" : "-"}
                    {Math.abs(minutes)}m
                  </div>
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
        <button onClick={() => openModal("incident")} type="button">
          Log Incident
        </button>
        <button onClick={() => openModal("reward")} type="button">
          Log Reward
        </button>
        <button onClick={() => openModal("note")} type="button">
          Add Note
        </button>
        <button onClick={() => openModal("detention")} type="button">
          Log Detention
        </button>
      </div>

      {openAction ? (
        <Modal
          onClose={() => setOpenAction("")}
          title={
            openAction === "detention" ? "Log detention" : `Log ${openAction}`
          }
        >
          <form className="teacher-edit-form" onSubmit={handleAction}>
            {openAction === "note" ? (
              <textarea
                onChange={(e) =>
                  setActionForm((v) => ({ ...v, text: e.target.value }))
                }
                placeholder="Add details..."
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
                value={actionForm.text}
              />
            ) : (
              <>
                <select
                  onChange={(e) =>
                    setActionForm((v) => ({ ...v, categoryId: e.target.value }))
                  }
                  required
                  style={{ gridColumn: "span 2" }}
                  value={actionForm.categoryId}
                >
                  <option value="" disabled>
                    {openAction === "reward"
                      ? "Select reward category"
                      : "Select behaviour category"}
                  </option>
                  {(openAction === "reward"
                    ? rewardCategories
                    : behaviourCategories
                  ).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {openAction === "reward" ? (
                  <div
                    style={{
                      gridColumn: "span 2",
                      color: "#94a3b8",
                      fontSize: ".95rem",
                      marginTop: "-6px",
                    }}
                  >
                    {rewardPreviewMinutes === null
                      ? ""
                      : rewardPreviewMinutes > 0
                        ? `Offsets ${rewardPreviewMinutes} minutes`
                        : "No offset minutes"}
                  </div>
                ) : (
                  <div
                    style={{
                      gridColumn: "span 2",
                      color: "#94a3b8",
                      fontSize: ".95rem",
                      marginTop: "-6px",
                    }}
                  >
                    {detentionPreviewMinutes === null
                      ? ""
                      : detentionPreviewMinutes > 0
                        ? `Triggers ${detentionPreviewMinutes} minutes detention`
                        : "This behaviour does not trigger detention."}
                  </div>
                )}

                {(openAction === "incident" || openAction === "detention") && (
                  <input
                    onChange={(e) =>
                      setActionForm((v) => ({
                        ...v,
                        occurredAt: e.target.value,
                      }))
                    }
                    required
                    style={{ gridColumn: "span 2" }}
                    type="datetime-local"
                    value={actionForm.occurredAt}
                  />
                )}

                {openAction === "reward" && (
                  <input
                    onChange={(e) =>
                      setActionForm((v) => ({
                        ...v,
                        awardedAt: e.target.value,
                      }))
                    }
                    style={{ gridColumn: "span 2" }}
                    type="datetime-local"
                    value={actionForm.awardedAt}
                  />
                )}

                <textarea
                  onChange={(e) =>
                    setActionForm((v) => ({ ...v, notes: e.target.value }))
                  }
                  placeholder="Add details... (optional)"
                  style={{
                    gridColumn: "span 2",
                    minHeight: "120px",
                    background: "#030712",
                    color: "#fff",
                    padding: "1rem",
                    borderRadius: "10px",
                    border: "1px solid #374151",
                  }}
                  value={actionForm.notes}
                />
              </>
            )}

            <button type="submit" className="form-submit">
              Confirm Action
            </button>
          </form>
        </Modal>
      ) : null}
    </section>
  );
};

export default StudentProfilePage;
