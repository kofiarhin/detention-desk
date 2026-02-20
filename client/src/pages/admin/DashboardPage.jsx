import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'
import './dashboard-page.styles.scss'

const AdminDashboardPage = () => {
  const { token } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', data: null })

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await apiRequest({ path: '/api/dashboard/admin', token })
        setState({ loading: false, error: '', data: payload.data })
      } catch (error) {
        setState({ loading: false, error: error.message, data: null })
      }
    }
    load()
  }, [token])

  if (state.loading) return <section className="app-page"><h1>Admin Dashboard</h1><p>Loading dashboard...</p></section>
  if (state.error) return <section className="app-page"><h1>Admin Dashboard</h1><p>{state.error}</p></section>

  const metrics = state.data?.metrics || {}
  const recent = state.data?.recent || {}

  return (
    <section className="app-page admin-dashboard-page">
      <h1>Admin Dashboard</h1>
      <div className="admin-dashboard-grid">
        {Object.entries(metrics).map(([key, value]) => (
          <article className="admin-dashboard-card" key={key}><h2>{key}</h2><p>{value}</p></article>
        ))}
      </div>
      <article className="admin-dashboard-list">
        <h2>Recent Activity</h2>
        {Array.isArray(recent.activities) && recent.activities.length ? (
          <ul>{recent.activities.map((item) => <li key={item.id || item._id}>{item.text || item.type || 'Activity'}</li>)}</ul>
        ) : <p>No recent activity.</p>}
      </article>
    </section>
  )
}

export default AdminDashboardPage
