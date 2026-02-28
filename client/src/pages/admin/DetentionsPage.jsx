import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./detentions-page.styles.scss";

const TAB_OPTIONS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "needsAttention", label: "Needs Attention" },
  { key: "history", label: "History" },
];

const toLocalInputValue = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const fromLocalInputValue = (dateValue) => {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const formatScheduled = (scheduledFor) => {
  if (!scheduledFor) return "Not scheduled";
  const date = new Date(scheduledFor);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString();
};

const statusLabel = (status) => `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

const getCategoryName = (detention) => detention?.incidentId?.categoryId?.name || "—";

const getAssignedByName = (detention) => detention?.createdBy?.name || detention?.assignedTeacherId?.name || "—";

const AdminDetentionsPage = () => {
  const { token, user } = useAuth();
  const [detentions, setDetentions] = useState([]);
  const [counts, setCounts] = useState({
    upcoming: 0,
    today: 0,
    needsAttention: 0,
    history: 0,
  });
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0, limit: 20 });
  const [view, setView] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState("");
  const [editForm, setEditForm] = useState({ scheduledFor: "" });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const commandCenterPath = useMemo(() => {
    const params = new URLSearchParams({
      view,
      page: String(page),
      limit: "20",
    });

    return `/detentions/ops?${params.toString()}`;
  }, [page, view]);

  const loadCommandCenter = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest({ path: commandCenterPath, token });
      setDetentions(payload?.data?.items || []);
      setCounts(payload?.data?.counts || {});
      setMeta(payload?.data?.meta || { page: 1, pages: 0, total: 0, limit: 20 });
    } catch (err) {
      setError(err.message || "Could not load detentions");
    } finally {
      setLoading(false);
    }
  }, [commandCenterPath, token]);

  useEffect(() => {
    void loadCommandCenter();
  }, [loadCommandCenter]);

  const handleAction = async (path, body = {}, message = "Updated detention") => {
    setFeedback({ type: "", message: "" });

    try {
      await apiRequest({ path, method: "POST", body, token });
      setFeedback({ type: "success", message });
      setExpandedRowId("");
      await loadCommandCenter();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Action failed" });
    }
  };

  const handleSaveEdit = async (detentionId) => {
    const nextScheduledFor = fromLocalInputValue(editForm.scheduledFor);

    try {
      await apiRequest({
        path: `/detentions/${detentionId}`,
        method: "PUT",
        body: { scheduledFor: nextScheduledFor },
        token,
      });
      setFeedback({ type: "success", message: "Detention updated." });
      setExpandedRowId("");
      await loadCommandCenter();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Could not update detention" });
    }
  };

  const isAdmin = user?.role === "schoolAdmin";
  const canServe = (item) => {
    if (item.status === "served" || item.status === "voided") return false;
    if (isAdmin) return true;
    if (user?.role !== "teacher") return false;
    return String(item?.createdBy?._id || "") === String(user?.id || "");
  };

  const canEdit = (item) => isAdmin && !["served", "voided"].includes(item.status);
  const canVoid = (item) => isAdmin && !["served", "voided"].includes(item.status);

  return (
    <section className="app-page detention-command-center">
      <header className="detention-command-center-header">
        <h1>Detention Command Center</h1>
      </header>

      <nav className="detention-command-center-tabs">
        {TAB_OPTIONS.map((tab) => (
          <button
            className={`detention-command-center-tab ${view === tab.key ? "active" : ""}`}
            key={tab.key}
            onClick={() => {
              setView(tab.key);
              setPage(1);
            }}
            type="button"
          >
            <span>{tab.label}</span>
            <span className="detention-command-center-tab-count">{counts?.[tab.key] || 0}</span>
          </button>
        ))}
      </nav>

      {feedback.message ? (
        <div className={`detention-command-center-feedback ${feedback.type}`}>{feedback.message}</div>
      ) : null}

      {loading ? <p className="detention-command-center-state">Loading detentions…</p> : null}
      {error ? <p className="detention-command-center-state error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="detention-command-center-table-wrap">
            <table className="detention-command-center-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Minutes Assigned</th>
                  <th>Scheduled For</th>
                  <th>Status</th>
                  <th>Assigned By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!detentions.length ? (
                  <tr>
                    <td className="detention-command-center-empty" colSpan={7}>
                      No detentions found for this queue.
                    </td>
                  </tr>
                ) : null}

                {detentions.map((item) => {
                  const isOverdue = item.status === "scheduled" && item.scheduledFor
                    ? new Date(item.scheduledFor).getTime() < Date.now()
                    : false;

                  return (
                    <Fragment key={item._id}>
                      <tr key={item._id}>
                        <td>
                          {item.studentId?._id ? (
                            <Link to={`/admin/students/${item.studentId._id}`}>
                              {item.studentId.firstName} {item.studentId.lastName}
                            </Link>
                          ) : (
                            <span>Unknown student</span>
                          )}
                          {item.studentId?.admissionNumber ? (
                            <div className="detention-command-center-subtext">{item.studentId.admissionNumber}</div>
                          ) : null}
                        </td>
                        <td>{getCategoryName(item)}</td>
                        <td>{item.minutesAssigned} mins</td>
                        <td>
                          {formatScheduled(item.scheduledFor)}
                          {isOverdue ? <div className="detention-command-center-overdue">Overdue / Missed</div> : null}
                        </td>
                        <td>
                          <span className={`detention-command-center-status ${item.status}`}>
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td>{getAssignedByName(item)}</td>
                        <td>
                          <div className="detention-command-center-actions">
                            {canServe(item) ? (
                              <button
                                onClick={() =>
                                  handleAction(
                                    `/detentions/${item._id}/serve`,
                                    {},
                                    "Detention marked as served.",
                                  )
                                }
                                type="button"
                              >
                                Mark Served
                              </button>
                            ) : null}
                            {canEdit(item) ? (
                              <button
                                onClick={() => {
                                  setExpandedRowId(item._id);
                                  setEditForm({ scheduledFor: toLocalInputValue(item.scheduledFor) });
                                }}
                                type="button"
                              >
                                Edit
                              </button>
                            ) : null}
                            {canVoid(item) ? (
                              <button
                                onClick={() =>
                                  handleAction(`/detentions/${item._id}/void`, {}, "Detention voided.")
                                }
                                type="button"
                              >
                                Void
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {expandedRowId === item._id ? (
                        <tr className="detention-command-center-editor-row">
                          <td colSpan={7}>
                            <div className="detention-command-center-editor">
                              <label htmlFor={`scheduled-${item._id}`}>Scheduled For</label>
                              <input
                                id={`scheduled-${item._id}`}
                                onChange={(event) =>
                                  setEditForm((current) => ({ ...current, scheduledFor: event.target.value }))
                                }
                                type="datetime-local"
                                value={editForm.scheduledFor}
                              />

                              <button onClick={() => handleSaveEdit(item._id)} type="button">
                                Save
                              </button>
                              <button onClick={() => setExpandedRowId("")} type="button">
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="detention-command-center-footer">
            <div>
              Page {meta.page} of {meta.pages || 1} ({meta.total} total)
            </div>
            <div className="detention-command-center-pagination">
              <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">
                Previous
              </button>
              <button
                disabled={meta.pages ? page >= meta.pages : true}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </footer>
        </>
      ) : null}
    </section>
  );
};

export default AdminDetentionsPage;
