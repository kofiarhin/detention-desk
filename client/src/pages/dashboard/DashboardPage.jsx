import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardWidget from '../../components/dashboard-widget/DashboardWidget'
import KpiCard from '../../components/kpi-card/KpiCard'
import { apiRequest, isUnauthorizedError } from '../../lib/api'
import { clearSession } from '../../lib/auth'
import './dashboard-page.styles.scss'

const DashboardPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await apiRequest('/api/dashboard/admin')
        setDashboard(data)
      } catch (requestError) {
        if (isUnauthorizedError(requestError)) {
          clearSession()
          navigate('/login', { replace: true })
          return
        }

        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [navigate])

  const kpis = useMemo(() => {
    if (!dashboard?.metrics) {
      return []
    }

    const { metrics } = dashboard

    return [
      { id: 'incidents7d', label: 'Incidents (7d)', value: metrics.totalIncidents7d },
      { id: 'detentions7d', label: 'Detentions (7d)', value: metrics.totalDetentions7d },
      { id: 'minutesRemaining', label: 'Minutes Remaining', value: metrics.minutesRemainingTotal },
      { id: 'reward7d', label: 'Reward Minutes (7d)', value: metrics.rewardMinutesAwarded7d },
    ]
  }, [dashboard])

  if (loading) {
    return <main className="dashboard-state">Loading dashboard...</main>
  }

  if (error) {
    return <main className="dashboard-state">Error: {error}</main>
  }

  if (!dashboard) {
    return <main className="dashboard-state">No dashboard data yet.</main>
  }

  const pendingStudents = (dashboard.widgets?.studentsWithHighestPendingMinutes || []).map((item) => ({
    id: item.studentId,
    label: `${item.student?.firstName || 'Unknown'} ${item.student?.lastName || ''}`.trim(),
    value: `${item.pendingMinutes} min`,
  }))

  const categories = (dashboard.widgets?.mostFrequentBehaviourCategories || []).map((item) => ({
    id: item.categoryId,
    label: item.categoryName || 'Uncategorized',
    value: item.count,
  }))

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
      </header>

      <section className="dashboard-kpis">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} label={kpi.label} value={kpi.value} />
        ))}
      </section>

      <section className="dashboard-widgets">
        <DashboardWidget
          emptyText="No pending students"
          items={pendingStudents}
          title="Top Students by Pending Minutes"
        />
        <DashboardWidget
          emptyText="No category data"
          items={categories}
          title="Most Frequent Categories"
        />
      </section>
    </main>
  )
}

export default DashboardPage
