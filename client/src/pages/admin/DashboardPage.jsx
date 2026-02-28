import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import "./dashboard-page.styles.scss";

const AdminDashboardPage = () => {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await apiRequest({
          path: "/dashboard/admin",
          token,
        });
        setState({ loading: false, error: "", data: payload.data });
      } catch (error) {
        setState({ loading: false, error: error.message, data: null });
      }
    };
    load();
  }, [token]);

  const formatLabel = (key) => {
    // Converts "totalIncidents7d" to "Total Incidents (7d)"
    const result = key.replace(/([A-Z])/g, " $1").replace(/(\d+d)$/, " ($1)");
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  if (state.loading)
    return (
      <section className="app-page loading">
        <h1>Loading...</h1>
      </section>
    );
  if (state.error)
    return (
      <section className="app-page error">
        <h1>Error</h1>
        <p>{state.error}</p>
      </section>
    );

  const { metrics = {}, recent = {} } = state.data || {};
  const { detentionsByStatus: status = {} } = metrics;
  const metricEntries = Object.entries(metrics).filter(
    ([key]) => key !== "detentionsByStatus",
  );

  return (
    <section className="admin-dashboard-page">
      <header className="admin-dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Real-time school performance metrics</p>
      </header>

      <div className="admin-dashboard-grid">
        {metricEntries.map(([key, value]) => (
          <article className="admin-dashboard-card" key={key}>
            <span className="card-label">{formatLabel(key)}</span>
            <h2 className="card-value">{value ?? 0}</h2>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-secondary">
        <article className="admin-dashboard-status">
          <h3>Detentions by Status</h3>
          <div className="status-list">
            {Object.entries(status).map(([key, val]) => (
              <div className="status-row" key={key}>
                <span className={`dot ${key}`}></span>
                <span className="label">{key}</span>
                <span className="count">{val}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-dashboard-activity">
          <h3>Recent Activity</h3>
          <div className="activity-feed">
            {recent.activities?.length ? (
              recent.activities.map((item) => (
                <div className="activity-item" key={item.id || item._id}>
                  <p>{item.text || item.type}</p>
                </div>
              ))
            ) : (
              <p className="empty-state">No recent activity found.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
};

export default AdminDashboardPage;
