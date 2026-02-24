import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./detentions-page.styles.scss";

const AdminDetentionsPage = () => {
  const { token } = useAuth();
  const [detentions, setDetentions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [result, setResult] = useState("");

  const load = useCallback(async () => {
    const payload = await apiRequest({
      path: `/api/detentions?status=${status}`,
      token,
    });
    setDetentions(payload.data || []);
  }, [status, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const runBulk = async (path, body = {}) => {
    if (!selected.length) return;
    if (!window.confirm(`Apply action to ${selected.length} items?`)) return;

    try {
      const payload = await apiRequest({
        path,
        method: "POST",
        token,
        body: { detentionIds: selected, ...body },
      });
      setResult(`Success: Updated ${selected.length} records.`);
      setSelected([]);
      load();
    } catch (err) {
      setResult(`Error: ${err.message}`);
    }
  };

  return (
    <section className="app-page">
      <h1>Bulk Detention Operations</h1>

      <div className="detention-filters">
        <label htmlFor="status-filter">Filter by Status</label>
        <select
          id="status-filter"
          onChange={(e) => setStatus(e.target.value)}
          value={status}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="served">Served</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      <table className="admin-detentions-table">
        <thead>
          <tr>
            <th style={{ width: "40px" }}>
              <input
                type="checkbox"
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? detentions.map((d) => d._id) : [],
                  )
                }
                checked={
                  selected.length === detentions.length && detentions.length > 0
                }
              />
            </th>
            <th>Detention Details</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {detentions.map((item) => (
            <tr key={item._id}>
              <td>
                <input
                  checked={selected.includes(item._id)}
                  onChange={() => toggle(item._id)}
                  type="checkbox"
                />
              </td>
              <td>{item.reason || "General Detention"}</td>
              <td className={`status-${item.status}`}>{item.status}</td>
              <td>{item.minutesAssigned} mins</td>
            </tr>
          ))}
        </tbody>
      </table>

      {detentions.length === 0 && <p>No detentions found for this filter.</p>}

      <div className="bulk-actions-bar">
        <button
          disabled={!selected.length}
          onClick={() => runBulk("/api/detentions/bulk/serve")}
          type="button"
        >
          Mark Served
        </button>
        <button
          disabled={!selected.length}
          onClick={() => runBulk("/api/detentions/bulk/void")}
          type="button"
        >
          Void
        </button>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            onChange={(e) => setScheduledFor(e.target.value)}
            type="datetime-local"
            value={scheduledFor}
          />
          <button
            className="btn-primary"
            disabled={!selected.length || !scheduledFor}
            onClick={() =>
              runBulk("/api/detentions/bulk/schedule", {
                scheduledFor: new Date(scheduledFor).toISOString(),
              })
            }
            type="button"
          >
            Schedule
          </button>
        </div>

        {selected.length > 0 && (
          <span style={{ color: "#6366f1", fontWeight: "bold" }}>
            {selected.length} Selected
          </span>
        )}
      </div>

      {result ? <div className="result-log">{result}</div> : null}
    </section>
  );
};

export default AdminDetentionsPage;
