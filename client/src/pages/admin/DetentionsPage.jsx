import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./detentions-page.styles.scss";

const TAB_OPTIONS = [
  { key: "needsAttention", label: "Needs Attention" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "unscheduled", label: "Unscheduled" },
  { key: "history", label: "History" },
];

const STATUS_OPTIONS = ["pending", "scheduled", "served", "voided"];

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

const formatGroup = (group) => {
  if (!group) return "Unassigned";
  if (group.label) return group.label;
  if (group.year || group.form) return `Year ${group.year || "-"} Form ${group.form || "-"}`;
  return "Unassigned";
};

const statusLabel = (status) => `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

const AdminDetentionsPage = () => {
  const { token } = useAuth();
  const [detentions, setDetentions] = useState([]);
  const [counts, setCounts] = useState({
    needsAttention: 0,
    today: 0,
    upcoming: 0,
    unscheduled: 0,
    history: 0,
  });
  const [groups, setGroups] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0, limit: 20 });
  const [view, setView] = useState("needsAttention");
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState("");
  const [editForm, setEditForm] = useState({ mode: "schedule", scheduledFor: "", status: "scheduled" });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canBulkAct = selected.length > 0;

  const commandCenterPath = useMemo(() => {
    const params = new URLSearchParams({
      view,
      page: String(page),
      limit: "20",
    });

    if (query.trim()) params.set("q", query.trim());
    if (groupId) params.set("groupId", groupId);
    if (status) params.set("status", status);

    return `/api/detentions/command-center?${params.toString()}`;
  }, [groupId, page, query, status, view]);

  const loadCommandCenter = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest({ path: commandCenterPath, token });
      setDetentions(payload?.data?.items || []);
      setCounts(payload?.data?.counts || {});
      setMeta(payload?.data?.meta || { page: 1, pages: 0, total: 0, limit: 20 });
    } catch (err) {
      setError(err.message || "Could not load command center");
    } finally {
      setLoading(false);
    }
  }, [commandCenterPath, token]);

  const loadGroups = useCallback(async () => {
    try {
      const payload = await apiRequest({ path: "/api/admin/groups", token });
      setGroups(payload?.data || []);
    } catch (err) {
      setGroups([]);
    }
  }, [token]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    void loadCommandCenter();
  }, [loadCommandCenter]);

  useEffect(() => {
    setSelected([]);
  }, [view, query, groupId, status, page]);

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

    if (editForm.mode === "schedule" && !nextScheduledFor) {
      setFeedback({ type: "error", message: "Please select a valid schedule date and time." });
      return;
    }

    const body = {
      status: editForm.status,
      scheduledFor: nextScheduledFor,
    };

    try {
      await apiRequest({
        path: `/api/detentions/${detentionId}`,
        method: "PUT",
        body,
        token,
      });
      setFeedback({ type: "success", message: "Detention updated." });
      setExpandedRowId("");
      await loadCommandCenter();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Could not update detention" });
    }
  };

  const openEditor = (item, mode) => {
    setExpandedRowId(item._id);
    setEditForm({
      mode,
      scheduledFor: toLocalInputValue(item.scheduledFor),
      status: item.status === "pending" && mode === "schedule" ? "scheduled" : item.status,
    });
  };

  const clearFilters = () => {
    setQuery("");
    setGroupId("");
    setStatus("");
    setPage(1);
  };

  const toggleSelect = (detentionId) => {
    setSelected((current) =>
      current.includes(detentionId)
        ? current.filter((item) => item !== detentionId)
        : [...current, detentionId],
    );
  };

  const runBulkAction = async (path, body = {}, successMessage = "Bulk action complete") => {
    if (!canBulkAct) return;

    try {
      await apiRequest({
        path,
        method: "POST",
        token,
        body: { detentionIds: selected, ...body },
      });
      setSelected([]);
      setFeedback({ type: "success", message: successMessage });
      await loadCommandCenter();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Bulk action failed" });
    }
  };

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

      <div className="detention-command-center-filters">
        <input
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search student name or admission number"
          type="text"
          value={query}
        />

        <select
          onChange={(event) => {
            setGroupId(event.target.value);
            setPage(1);
          }}
          value={groupId}
        >
          <option value="">All groups</option>
          {groups.map((group) => (
            <option key={group._id} value={group._id}>
              {formatGroup(group)}
            </option>
          ))}
        </select>

        <select
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {statusLabel(option)}
            </option>
          ))}
        </select>

        <button onClick={clearFilters} type="button">
          Clear Filters
        </button>
      </div>

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
                  <th>
                    <input
                      checked={detentions.length > 0 && selected.length === detentions.length}
                      onChange={(event) =>
                        setSelected(event.target.checked ? detentions.map((item) => item._id) : [])
                      }
                      type="checkbox"
                    />
                  </th>
                  <th>Student</th>
                  <th>Group</th>
                  <th>Duration</th>
                  <th>Scheduled</th>
                  <th>Status</th>
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
                  const isFinalized = item.status === "served" || item.status === "voided";
                  const isOverdue = item.status === "scheduled" && item.scheduledFor
                    ? new Date(item.scheduledFor).getTime() < Date.now()
                    : false;

                  return (
                    <Fragment key={item._id}>
                      <tr key={item._id}>
                        <td>
                          <input
                            checked={selected.includes(item._id)}
                            onChange={() => toggleSelect(item._id)}
                            type="checkbox"
                          />
                        </td>
                        <td>
                          {item.student?._id ? (
                            <Link to={`/admin/students/${item.student._id}`}>
                              {item.student.firstName} {item.student.lastName}
                            </Link>
                          ) : (
                            <span>Unknown student</span>
                          )}
                          {item.student?.admissionNumber ? (
                            <div className="detention-command-center-subtext">{item.student.admissionNumber}</div>
                          ) : null}
                        </td>
                        <td>{formatGroup(item.group)}</td>
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
                        <td>
                          <div className="detention-command-center-actions">
                            {!isFinalized && item.status === "pending" && !item.scheduledFor ? (
                              <button onClick={() => openEditor(item, "schedule")} type="button">
                                Schedule
                              </button>
                            ) : null}
                            {!isFinalized && item.status === "scheduled" ? (
                              <button onClick={() => openEditor(item, "schedule")} type="button">
                                Reschedule
                              </button>
                            ) : null}
                            {!isFinalized ? (
                              <button
                                onClick={() =>
                                  handleAction(
                                    `/api/detentions/${item._id}/serve`,
                                    {},
                                    "Detention marked as served.",
                                  )
                                }
                                type="button"
                              >
                                Mark Served
                              </button>
                            ) : null}
                            {!isFinalized ? (
                              <button
                                onClick={() =>
                                  handleAction(`/api/detentions/${item._id}/void`, {}, "Detention voided.")
                                }
                                type="button"
                              >
                                Void
                              </button>
                            ) : null}
                            <button onClick={() => openEditor(item, "edit")} type="button">
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedRowId === item._id ? (
                        <tr className="detention-command-center-editor-row" key={`${item._id}-editor`}>
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

                              <label htmlFor={`status-${item._id}`}>Status</label>
                              <select
                                id={`status-${item._id}`}
                                onChange={(event) =>
                                  setEditForm((current) => ({ ...current, status: event.target.value }))
                                }
                                value={editForm.status}
                              >
                                {STATUS_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {statusLabel(option)}
                                  </option>
                                ))}
                              </select>

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

          <section className="detention-command-center-bulk">
            <h2>Bulk actions (secondary)</h2>
            <p>{selected.length} selected</p>
            <div className="detention-command-center-bulk-actions">
              <button
                disabled={!canBulkAct}
                onClick={() => runBulkAction("/api/detentions/bulk/serve", {}, "Bulk marked served.")}
                type="button"
              >
                Bulk Serve
              </button>
              <button
                disabled={!canBulkAct}
                onClick={() => runBulkAction("/api/detentions/bulk/void", {}, "Bulk void complete.")}
                type="button"
              >
                Bulk Void
              </button>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
};

export default AdminDetentionsPage;
